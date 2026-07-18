"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { backendFetch } from "./backend";
import { ACCESS_TOKEN_COOKIE } from "@/lib/constants";
import { isAdminRole } from "@/lib/auth";
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
  revalidatePath("/order/success", "page");
  return payment;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    const jsonPayload = decodeURIComponent(
      atob(base64 + padding)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

async function validateAdminRole(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) {
    throw new Error("unauthorized");
  }
  const payload = decodeJwtPayload(token);
  const role = typeof payload?.role === "string" ? payload.role : undefined;
  if (!role || !isAdminRole(role)) {
    throw new Error("unauthorized");
  }
}

export async function updateOrderStatusAction(input: { orderId: string; status: string }): Promise<Order> {
  await validateAdminRole();
  const order = await backendFetch<Order>(`/orders/${input.orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: input.status }),
  });
  revalidateTag("orders", "max");
  revalidatePath("/admin/orders", "page");
  revalidatePath(`/admin/orders/${input.orderId}`, "page");
  return order;
}
