import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";

export type SearchProduct = {
  id: string;
  title: string;
  description?: string;
  price: number;
  stock: number;
  categoryName: string;
  categoryId?: string;
  image?: string | null;
  createdAt?: string;
};

export function useProductSearch(params: {
  q: string;
  categoryId?: string;
  minPrice?: string;
  maxPrice?: string;
  minStock?: string;
  sort?: string;
}) {
  return useQuery({
    queryKey: ["search", "products", params],
    queryFn: async () => (await api.get<SearchProduct[]>("/search/products", { params })).data,
  });
}

export function useSearchSuggest(query: string) {
  return useQuery({
    queryKey: ["search", "suggest", query],
    queryFn: async () => (await api.get<SearchProduct[]>("/search/suggest", { params: { q: query } })).data,
    enabled: query.trim().length >= 2,
  });
}

export function useAdminProductSearch(params: {
  q: string;
  categoryId?: string;
  minPrice?: string;
  maxPrice?: string;
  minStock?: string;
  sort?: string;
}) {
  return useQuery({
    queryKey: ["admin", "search", "products", params],
    queryFn: async () => (await api.get<SearchProduct[]>("/admin/search/products", { params })).data,
    enabled: params.q.trim().length > 0 || Boolean(params.categoryId || params.minPrice || params.maxPrice || params.minStock || params.sort),
  });
}
