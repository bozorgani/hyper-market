import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import type { PaginationMeta } from "@/types/domain";

// Canonical client-side shape used everywhere search results are rendered.
// Field names deliberately mirror `Product` (name / images) instead of the raw
// search API which returns `title` / `image`.
export type SearchProduct = {
  id: string;
  name: string;
  description?: string;
  price: number;
  discountPrice?: number | null;
  effectivePrice?: number;
  stock: number;
  categoryName?: string;
  images?: string[];
  createdAt?: string;
};

type SearchFacets = {
  categories: Record<string, number>;
  brands: Record<string, number>;
  tags: Record<string, number>;
  status?: Record<string, number>;
};

export type SearchResponse = {
  items: SearchProduct[];
  total: number;
  page: number;
  limit: number;
  meta?: PaginationMeta;
  facets: SearchFacets;
};

// Raw payload from the search API (Meilisearch documents). Fields differ from
// the canonical Product (title vs name, image vs images), so we normalize them
// once here into SearchProduct.
type RawSearchHit = {
  id: string;
  title: string;
  description?: string;
  price: number;
  discountPrice?: number | null;
  effectivePrice?: number;
  stock: number;
  categoryName?: string;
  image?: string | null;
  createdAt?: string;
};

type RawSearchResponse = {
  items: RawSearchHit[];
  total: number;
  page: number;
  limit: number;
  meta?: PaginationMeta;
  facets: SearchFacets;
};

function normalizeSearchHit(hit: RawSearchHit): SearchProduct {
  return {
    id: hit.id,
    name: hit.title,
    description: hit.description,
    price: hit.price,
    discountPrice: hit.discountPrice ?? null,
    effectivePrice: hit.effectivePrice,
    stock: hit.stock,
    categoryName: hit.categoryName,
    images: hit.image ? [hit.image] : [],
    createdAt: hit.createdAt,
  };
}

function normalizeSearchResponse(response: RawSearchResponse): SearchResponse {
  // Deduplicate items by id — backend search may return duplicates
  const seen = new Set<string>();
  const uniqueItems: SearchProduct[] = [];
  for (const item of response.items) {
    const normalized = normalizeSearchHit(item);
    if (!seen.has(normalized.id)) {
      seen.add(normalized.id);
      uniqueItems.push(normalized);
    }
  }
  return {
    ...response,
    items: uniqueItems,
    total: uniqueItems.length,
    facets: response.facets ?? { categories: {}, brands: {}, tags: {} },
  };
}

export function useProductSearch(params: {
  q: string;
  categoryId?: string;
  minPrice?: string;
  maxPrice?: string;
  minStock?: string;
  sort?: string;
  page?: number;
  limit?: number;
}, initialData?: SearchResponse) {
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
