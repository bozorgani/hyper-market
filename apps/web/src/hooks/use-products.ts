import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import type { Category, Product, ProductListResponse } from "@/types/domain";

export function useProducts(page: number, categoryId?: string, search?: string) {
  return useQuery({
    queryKey: ["products", page, categoryId, search],
    queryFn: async () => {
      const { data } = await api.get<ProductListResponse>("/products", {
        params: { page, limit: 12, categoryId, search },
      });
      return data;
    },
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: async () => (await api.get<Product>(`/products/${id}`)).data,
    enabled: Boolean(id),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await api.get<Category[]>("/categories")).data,
    retry: false,
  });
}
