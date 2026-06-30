import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createIdempotencyKey } from "@/lib/idempotency";
import { api } from "@/services/api";
import type { Order, Payment } from "@/types/domain";

export function useMyOrders() {
  return useQuery({
    queryKey: ["orders", "my"],
    queryFn: async () => (await api.get<Order[]>("/orders/my")).data,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      (await api.post<Order>("/orders", {}, { headers: { "Idempotency-Key": createIdempotencyKey("order") } })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", "my"] });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
}

export function useCreatePayment() {
  return useMutation({
    mutationFn: async (orderId: string) =>
      (await api.post<Payment>("/payments/create", { orderId, method: "mock" }, { headers: { "Idempotency-Key": createIdempotencyKey("payment-create") } })).data,
  });
}

export function useSimulatePaymentSuccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) =>
      (await api.post<Payment>("/payments/simulate-success", { orderId }, { headers: { "Idempotency-Key": createIdempotencyKey("payment-success") } })).data,
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
