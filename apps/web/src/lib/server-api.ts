import type { Category, Product, ProductListResponse } from "@/types/domain";
import type { SearchResponse } from "@/hooks/use-search";

function getServerApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.PUBLIC_API_BASE_URL;
  if (configured?.startsWith("http")) {
    return configured.replace(/\/$/, "");
  }

  return "http://localhost:3001/api/v1";
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

async function safeFetch<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${getServerApiBaseUrl()}${path}`, {
      next: { revalidate: 300 },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchProductForMetadata(id: string): Promise<Product | null> {
  return safeFetch<Product>(`/products/${encodeURIComponent(id)}`);
}

export async function fetchProductListForSSR(params: {
  page?: number;
  limit?: number;
  categoryId?: string;
  search?: string;
}): Promise<ProductListResponse | null> {
  return safeFetch<ProductListResponse>(`/products${toQuery({ page: params.page ?? 1, limit: params.limit ?? 12, categoryId: params.categoryId, search: params.search })}`);
}

export async function fetchCategoriesForSSR(): Promise<Category[] | null> {
  return safeFetch<Category[]>("/categories");
}

export async function fetchSearchForSSR(params: {
  q?: string;
  page?: number;
  limit?: number;
  categoryId?: string;
  minPrice?: string;
  maxPrice?: string;
  minStock?: string;
  sort?: string;
}): Promise<SearchResponse | null> {
  return safeFetch<SearchResponse>(`/search/products${toQuery({ q: params.q, page: params.page ?? 1, limit: params.limit ?? 24, categoryId: params.categoryId, minPrice: params.minPrice, maxPrice: params.maxPrice, minStock: params.minStock, sort: params.sort })}`);
}

export async function fetchCategoryForMetadata(id: string): Promise<Category | null> {
  return safeFetch<Category>(`/categories/${encodeURIComponent(id)}`);
}
