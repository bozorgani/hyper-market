import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import type { CartSummary } from "@/types/domain";

export function useCart() {
  return useQuery({
    queryKey: ["cart"],
    queryFn: async () => (await api.get<CartSummary>("/cart/my")).data,
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { productId: string; quantity: number }) => (await api.post<CartSummary>("/cart/add", input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  });
}

export function useRemoveFromCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (productId: string) => (await api.post<CartSummary>("/cart/remove", { productId })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post("/cart/clear", {})).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  });
}
