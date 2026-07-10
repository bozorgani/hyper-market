import type { PaginationMeta } from "@/types/domain";

export type SearchProduct = {
  id: string;
  name: string;
  description?: string;
  price: number;
  discountPrice?: number | null;
  effectivePrice?: number;
  stock: number;
  categoryName?: string;
  categoryId?: string;
  brand?: string | null;
  tags?: string[];
  images?: string[];
  createdAt?: string;
};

export type SearchFacets = {
  categories: Record<string, number>;
  brands: Record<string, number>;
  tags: Record<string, number>;
  status?: Record<string, number>;
};

/**
 * Raw payload returned by the Meilisearch-backed API.
 * The API uses `title`/`image`, while the UI uses `name`/`images`.
 */
export type RawSearchHit = {
  id: string;
  title?: string;
  name?: string;
  description?: string;
  price: number;
  discountPrice?: number | null;
  effectivePrice?: number;
  stock: number;
  categoryName?: string;
  categoryId?: string;
  brand?: string | null;
  tags?: string[];
  image?: string | null;
  images?: string[];
  createdAt?: string;
};

export type RawSearchResponse = {
  items: RawSearchHit[];
  total: number;
  page: number;
  limit: number;
  meta?: PaginationMeta;
  facets?: SearchFacets;
};

export type SearchResponse = {
  items: SearchProduct[];
  /** Total number of matching products across all pages. */
  total: number;
  page: number;
  limit: number;
  meta: PaginationMeta;
  facets: SearchFacets;
};

const EMPTY_FACETS: SearchFacets = {
  categories: {},
  brands: {},
  tags: {},
};

export function normalizeSearchHit(hit: RawSearchHit): SearchProduct {
  const images = hit.images ?? (hit.image ? [hit.image] : []);

  return {
    id: hit.id,
    name: hit.name ?? hit.title ?? "",
    description: hit.description,
    price: hit.price,
    discountPrice: hit.discountPrice ?? null,
    effectivePrice: hit.effectivePrice,
    stock: hit.stock,
    categoryName: hit.categoryName,
    categoryId: hit.categoryId,
    brand: hit.brand,
    tags: hit.tags,
    images,
    createdAt: hit.createdAt,
  };
}

function derivePaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;

  return {
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

/**
 * Converts the raw API response into the canonical UI shape.
 *
 * Deduplication only affects the current page's rendered items. `total` is
 * intentionally preserved from the API because it represents all matches,
 * not the number of items returned in this page.
 */
export function normalizeSearchResponse(response: RawSearchResponse): SearchResponse {
  const seen = new Set<string>();
  const items: SearchProduct[] = [];

  for (const item of response.items ?? []) {
    const normalized = normalizeSearchHit(item);
    if (seen.has(normalized.id)) continue;
    seen.add(normalized.id);
    items.push(normalized);
  }

  const total = Number.isFinite(response.total) ? response.total : items.length;
  const page = Number.isInteger(response.page) && response.page > 0 ? response.page : 1;
  const limit = Number.isInteger(response.limit) && response.limit > 0 ? response.limit : Math.max(items.length, 1);

  return {
    items,
    total,
    page,
    limit,
    meta: response.meta ?? derivePaginationMeta(total, page, limit),
    facets: response.facets ?? EMPTY_FACETS,
  };
}
