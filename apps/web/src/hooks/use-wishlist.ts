"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useToast } from "@/components/ui/toast";

interface AxiosErrorResponse {
  response?: {
    data?: {
      message?: string;
    };
  };
}

export interface WishlistProduct {
  _id: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number | null;
  discountPercentage?: number;
  images: string[];
  stock: number;
  categoryId: string;
  isActive: boolean;
  brand?: string | null;
  sku?: string | null;
  unit?: string | null;
  weight?: number | null;
  tags?: string[];
}

interface WishlistResponse {
  products: WishlistProduct[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

type WishlistToggleApiResponse = {
  message?: string;
  action?: "added" | "removed";
  isInWishlist?: boolean;
  productCount?: number;
};

export type WishlistToggleResult = WishlistToggleApiResponse & {
  isInWishlist: boolean;
};

function resolveWishlistState(response: WishlistToggleApiResponse): boolean {
  if (typeof response.isInWishlist === "boolean") return response.isInWishlist;
  if (response.action === "added") return true;
  if (response.action === "removed") return false;

  const message = response.message?.toLowerCase() ?? "";
  if (message.includes("added")) return true;
  if (message.includes("removed")) return false;

  throw new Error("Wishlist toggle response did not include an operation state");
}

export function useWishlist(page = 1, limit = 20, enabled = true) {
  return useQuery<WishlistResponse>({
    queryKey: ["wishlist", page, limit],
    queryFn: async () => {
      const response = await api.get("/wishlist", {
        params: { page, limit },
      });
      return response.data;
    },
    enabled,
  });
}

export function useWishlistCount(enabled = true) {
  return useQuery<{ count: number }>({
    queryKey: ["wishlist-count"],
    queryFn: async () => {
      const response = await api.get("/wishlist/count");
      return response.data;
    },
    enabled,
  });
}

export function useIsInWishlist(productId: string, enabled = true) {
  return useQuery<{ isInWishlist: boolean }>({
    queryKey: ["wishlist-check", productId],
    queryFn: async () => {
      const response = await api.get("/wishlist/check", {
        params: { productId },
      });
      return response.data;
    },
    enabled: Boolean(productId && enabled),
  });
}

export function useAddToWishlist() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (productId: string) => {
      const response = await api.post("/wishlist/add", { productId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      queryClient.invalidateQueries({ queryKey: ["wishlist-count"] });
      showToast({
        type: "success",
        title: "به علاقه‌مندی‌ها اضافه شد",
      });
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosErrorResponse;
      const message = axiosError.response?.data?.message || "لطفاً دوباره تلاش کنید";
      showToast({
        type: "error",
        title: "افزودن به علاقه‌مندی‌ها ناموفق بود",
        description: message,
      });
    },
  });
}

export function useRemoveFromWishlist() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (productId: string) => {
      const response = await api.delete("/wishlist/remove", {
        data: { productId },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      queryClient.invalidateQueries({ queryKey: ["wishlist-count"] });
      showToast({
        type: "success",
        title: "از علاقه‌مندی‌ها حذف شد",
      });
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosErrorResponse;
      showToast({
        type: "error",
        title: "حذف از علاقه‌مندی‌ها ناموفق بود",
        description: axiosError.response?.data?.message || "لطفاً دوباره تلاش کنید",
      });
    },
  });
}

export function useToggleWishlist() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation<WishlistToggleResult, unknown, string>({
    mutationFn: async (productId: string) => {
      const response = await api.post<WishlistToggleApiResponse>("/wishlist/toggle", { productId });
      return {
        ...response.data,
        isInWishlist: resolveWishlistState(response.data),
      };
    },
    onSuccess: (data, productId) => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      queryClient.invalidateQueries({ queryKey: ["wishlist-count"] });
      queryClient.setQueryData(["wishlist-check", productId], { isInWishlist: data.isInWishlist });
      showToast({
        type: "success",
        title: data.isInWishlist
          ? "به علاقه‌مندی‌ها اضافه شد"
          : "از علاقه‌مندی‌ها حذف شد",
      });
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosErrorResponse;
      showToast({
        type: "error",
        title: "عملیات ناموفق بود",
        description: axiosError.response?.data?.message || "لطفاً دوباره تلاش کنید",
      });
    },
  });
}

export function useClearWishlist() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const response = await api.delete("/wishlist/clear");
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      queryClient.invalidateQueries({ queryKey: ["wishlist-count"] });
      showToast({
        type: "success",
        title: "علاقه‌مندی‌ها پاک شد",
      });
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosErrorResponse;
      showToast({
        type: "error",
        title: "پاک کردن علاقه‌مندی‌ها ناموفق بود",
        description: axiosError.response?.data?.message || "لطفاً دوباره تلاش کنید",
      });
    },
  });
}
