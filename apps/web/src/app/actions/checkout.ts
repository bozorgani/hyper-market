"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { backendFetch } from "./backend";
import type { DeliveryAddress, DeliveryWindow, Order, Payment } from "@/types/domain";
import type { CouponValidationResult } from "@/hooks/use-coupons";

type CreateOrderActionInput = {
  idempotencyKey?: string;
  deliveryAddress: DeliveryAddress;
  deliveryWindow: DeliveryWindow;
  couponCode?: string;
  shippingMethod?: "standard" | "express";
};

type CreatePaymentActionInput = {
  orderId: string;
  idempotencyKey?: string;
};

export async function validateCouponAction(code: string): Promise<CouponValidationResult> {
  if (process.env.PLAYWRIGHT_MOCK_ACTIONS === "1") {
    return { code: code.trim().toUpperCase(), percent: 10, discountAmount: 9900, subtotal: 99000, total: 89100 };
  }

  return backendFetch<CouponValidationResult>("/coupons/validate", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export async function createOrderAction(input: CreateOrderActionInput): Promise<Order> {
  if (process.env.PLAYWRIGHT_MOCK_ACTIONS === "1") {
    return {
      _id: "order-1",
      userId: "user-1",
      items: [],
      subtotalPrice: 99000,
      discountAmount: input.couponCode ? 9900 : 0,
      couponCode: input.couponCode ?? null,
      shippingMethod: input.shippingMethod ?? "standard",
      deliveryFee: 50000,
      freeShippingApplied: false,
      totalPrice: input.couponCode ? 139100 : 149000,
      status: "pending",
    };
  }

  const order = await backendFetch<Order>("/orders", {
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    body: JSON.stringify({
      deliveryAddress: input.deliveryAddress,
      deliveryWindow: input.deliveryWindow,
      ...(input.couponCode ? { couponCode: input.couponCode } : {}),
      ...(input.shippingMethod ? { shippingMethod: input.shippingMethod } : {}),
    }),
  });
  // Issue #20: consolidate Server Actions – use revalidateTag (Issue #18) + revalidatePath fallback
  revalidateTag("cart", "max");
  revalidateTag("orders", "max");
  revalidatePath("/cart", "page");
  revalidatePath("/orders", "page");
  return order;
}

export async function createPaymentAction(input: CreatePaymentActionInput): Promise<Payment> {
  if (process.env.PLAYWRIGHT_MOCK_ACTIONS === "1") {
    return { _id: "payment-1", orderId: input.orderId, userId: "user-1", amount: 149000, status: "paid", method: "cod" };
  }

  const payment = await backendFetch<Payment>("/payments/create", {
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    body: JSON.stringify({ orderId: input.orderId, method: "cod" }),
  });
  revalidateTag("orders", "max");
  revalidatePath("/orders", "page");
  revalidatePath(`/order/success?orderId=${input.orderId}`, "page");
  return payment;
}

export async function updateOrderStatusAction(input: { orderId: string; status: string }): Promise<Order> {
  const order = await backendFetch<Order>(`/orders/${input.orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: input.status }),
  });
  revalidateTag("orders", "max");
  revalidatePath("/admin/orders", "page");
  revalidatePath(`/admin/orders/${input.orderId}`, "page");
  return order;
}
