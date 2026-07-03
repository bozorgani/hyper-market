import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";

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
    queryFn: async () =>
      (await api.get<RawSearchHit[]>("/search/products", { params })).data.map(normalizeSearchHit),
    placeholderData: keepPreviousData,
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
}) {
  return useQuery({
    queryKey: ["admin", "search", "products", params],
    queryFn: async () =>
      (await api.get<RawSearchHit[]>("/admin/search/products", { params })).data.map(normalizeSearchHit),
    enabled:
      params.q.trim().length > 0 ||
      Boolean(params.categoryId || params.minPrice || params.maxPrice || params.minStock || params.sort),
  });
}
