import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createIdempotencyKey } from "@/lib/idempotency";
import { api } from "@/services/api";
import type { Order, Payment } from "@/types/domain";

type CreateOrderInput = {
  idempotencyKey?: string;
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

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input?: CreateOrderInput) =>
      (
        await api.post<Order>("/orders", {}, { headers: idempotencyHeaders(input?.idempotencyKey ?? createIdempotencyKey("order")) })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", "my"] });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
}

export function useCreatePayment() {
  return useMutation({
    mutationFn: async (input: string | CreatePaymentInput) => {
      const orderId = typeof input === "string" ? input : input.orderId;
      const idempotencyKey = typeof input === "string" ? createIdempotencyKey("payment-create") : input.idempotencyKey ?? createIdempotencyKey("payment-create");

      return (await api.post<Payment>("/payments/create", { orderId, method: "mock" }, { headers: idempotencyHeaders(idempotencyKey) })).data;
    },
  });
}

export function useSimulatePaymentSuccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: string | CreatePaymentInput) => {
      const orderId = typeof input === "string" ? input : input.orderId;
      const idempotencyKey = typeof input === "string" ? createIdempotencyKey("payment-success") : input.idempotencyKey ?? createIdempotencyKey("payment-success");

      return (await api.post<Payment>("/payments/simulate-success", { orderId }, { headers: idempotencyHeaders(idempotencyKey) })).data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders", "my"] }),
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
