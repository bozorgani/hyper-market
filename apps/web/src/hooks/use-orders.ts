import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createIdempotencyKey } from "@/lib/idempotency";
import { api } from "@/services/api";
import type { DeliveryAddress, DeliveryWindow, Order, Payment } from "@/types/domain";

type CreateOrderInput = {
  idempotencyKey?: string;
  deliveryAddress: DeliveryAddress;
  deliveryWindow: DeliveryWindow;
  couponCode?: string;
  shippingMethod?: "standard" | "express";
};

type CreatePaymentInput = {
  orderId: string;
  idempotencyKey?: string;
};

function idempotencyHeaders(key: string) {
  return { "Idempotency-Key": key };
}

export function useMyOrders() {
  return useQuery({
    queryKey: ["orders", "my"],
    queryFn: async () => (await api.get<Order[]>("/orders/my")).data,
  });
}

export function useOrder(orderId: string) {
  return useQuery({
    queryKey: ["orders", orderId],
    queryFn: async () => (await api.get<Order>(`/orders/${orderId}`)).data,
    enabled: Boolean(orderId),
    retry: false,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateOrderInput) =>
      (
        await api.post<Order>(
          "/orders",
          {
            deliveryAddress: input.deliveryAddress,
            deliveryWindow: input.deliveryWindow,
            ...(input.couponCode ? { couponCode: input.couponCode } : {}),
            ...(input.shippingMethod ? { shippingMethod: input.shippingMethod } : {}),
          },
          { headers: idempotencyHeaders(input.idempotencyKey ?? createIdempotencyKey("order")) },
        )
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", "my"] });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
}

/**
 * Create a COD (cash on delivery / پرداخت در محل) payment.
 * The backend auto-confirms the payment and transitions the order to PAID.
 */
export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: string | CreatePaymentInput) => {
      const orderId = typeof input === "string" ? input : input.orderId;
      const idempotencyKey = typeof input === "string" ? createIdempotencyKey("payment-create") : input.idempotencyKey ?? createIdempotencyKey("payment-create");

      return (await api.post<Payment>("/payments/create", { orderId, method: "cod" }, { headers: idempotencyHeaders(idempotencyKey) })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", "my"] });
      queryClient.invalidateQueries({ queryKey: ["payment"] });
    },
  });
}

export function usePayment(orderId: string) {
  return useQuery({
    queryKey: ["payment", orderId],
    queryFn: async () => (await api.get<Payment>(`/payments/${orderId}`)).data,
    enabled: Boolean(orderId),
    retry: false,
  });
}

/**
 * Batch-fetch payments for many orders in a SINGLE request (fixes the N+1
 * where every order card/row fired its own GET /payments/:orderId).
 */
export function usePaymentsBatch(orderIds: string[]) {
  const key = [...orderIds].sort().join(",");
  return useQuery({
    queryKey: ["payments", "batch", key],
    queryFn: async () => {
      if (orderIds.length === 0) return [] as Payment[];
      return (
        await api.get<Payment[]>("/payments/batch", {
          params: { orderIds: orderIds.join(",") },
        })
      ).data;
    },
    enabled: orderIds.length > 0,
    staleTime: 30_000,
  });
}
