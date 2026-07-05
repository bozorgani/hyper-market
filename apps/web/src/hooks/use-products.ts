import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import type { Category, Product, ProductListResponse } from "@/types/domain";

export function useProducts(page: number, categoryId?: string, search?: string, initialData?: ProductListResponse) {
  return useQuery({
    queryKey: ["products", page, categoryId, search],
    queryFn: async () => {
      const { data } = await api.get<ProductListResponse>("/products", {
        params: { page, limit: 12, categoryId, search },
      });
      return data;
    },
    initialData,
  });
}

export function useProduct(id: string, initialData?: Product) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: async () => (await api.get<Product>(`/products/${id}`)).data,
    enabled: Boolean(id),
    initialData,
  });
}

export function useCategories(initialData?: Category[]) {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await api.get<Category[]>("/categories")).data,
    retry: false,
    initialData,
  });
}
