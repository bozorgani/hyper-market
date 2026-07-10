import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import {
  normalizeSearchHit,
  normalizeSearchResponse,
  type RawSearchHit,
  type RawSearchResponse,
  type SearchResponse,
} from "@/lib/search-normalizer";

export type { SearchProduct, SearchResponse } from "@/lib/search-normalizer";

export function useProductSearch(
  params: {
    q: string;
    categoryId?: string;
    minPrice?: string;
    maxPrice?: string;
    minStock?: string;
    sort?: string;
    page?: number;
    limit?: number;
  },
  initialData?: SearchResponse,
) {
  return useQuery({
    queryKey: ["search", "products", params],
    queryFn: async () =>
      normalizeSearchResponse((await api.get<RawSearchResponse>("/search/products", { params })).data),
    placeholderData: keepPreviousData,
    initialData,
  });
}

export function useSearchSuggest(query: string) {
  return useQuery({
    queryKey: ["search", "suggest", query],
    queryFn: async () =>
      (await api.get<RawSearchHit[]>("/search/suggest", { params: { q: query } })).data.map(normalizeSearchHit),
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
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["admin", "search", "products", params],
    queryFn: async () =>
      normalizeSearchResponse((await api.get<RawSearchResponse>("/admin/search/products", { params })).data),
    enabled:
      params.q.trim().length > 0 ||
      Boolean(params.categoryId || params.minPrice || params.maxPrice || params.minStock || params.sort),
  });
}
