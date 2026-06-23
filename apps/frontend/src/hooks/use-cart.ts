import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { trackAnalyticsEvent } from "@/lib/analytics";
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
    onSuccess: (_data, variables) => {
      trackAnalyticsEvent({ type: "ADD_TO_CART", metadata: variables });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
}

export function useRemoveFromCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (productId: string) => (await api.post<CartSummary>("/cart/remove", { productId })).data,
    onSuccess: (_data, productId) => {
      trackAnalyticsEvent({ type: "REMOVE_FROM_CART", metadata: { productId } });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post("/cart/clear", {})).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  });
}
