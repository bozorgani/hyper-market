import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { addToCartAction, clearCartAction, removeFromCartAction, updateCartQuantityAction } from "@/app/actions/cart";
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
    mutationFn: addToCartAction,
    onSuccess: (_data, variables) => {
      trackAnalyticsEvent({ type: "ADD_TO_CART", metadata: variables });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
}

export function useUpdateCartQuantity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCartQuantityAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
}

export function useRemoveFromCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeFromCartAction,
    onSuccess: (_data, productId) => {
      trackAnalyticsEvent({ type: "REMOVE_FROM_CART", metadata: { productId } });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearCartAction,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  });
}
