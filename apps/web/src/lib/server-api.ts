import type { Category, Product, ProductListResponse } from "@/types/domain";
import {
  normalizeSearchResponse,
  type RawSearchResponse,
  type SearchResponse,
} from "@/lib/search-normalizer";

function getServerApiBaseUrl(): string {
  const configured = process.env.SERVER_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || process.env.PUBLIC_API_BASE_URL;
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

async function safeFetch<T>(
  path: string,
  options?: {
    tags?: string[];
    revalidate?: number;
  }
): Promise<T | null> {
  try {
    const response = await fetch(`${getServerApiBaseUrl()}${path}`, {
      next: {
        revalidate: options?.revalidate ?? 300,
        tags: options?.tags,
      },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchProductForMetadata(id: string): Promise<Product | null> {
  return safeFetch<Product>(`/products/${encodeURIComponent(id)}`, {
    tags: ["products", `product:${id}`],
    revalidate: 300,
  });
}

export async function fetchProductListForSSR(params: {
  page?: number;
  limit?: number;
  categoryId?: string;
  search?: string;
}): Promise<ProductListResponse | null> {
  const categoryTag = params.categoryId ? `category:${params.categoryId}` : undefined;
  return safeFetch<ProductListResponse>(
    `/products${toQuery({
      page: params.page ?? 1,
      limit: params.limit ?? 12,
      categoryId: params.categoryId,
      search: params.search,
    })}`,
    {
      tags: ["products", ...(categoryTag ? [categoryTag] : [])],
      revalidate: 120,
    }
  );
}

export async function fetchCategoriesForSSR(): Promise<Category[] | null> {
  return safeFetch<Category[]>("/categories", {
    tags: ["categories"],
    revalidate: 600,
  });
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
  const response = await safeFetch<RawSearchResponse>(
    `/search/products${toQuery({
      q: params.q,
      page: params.page ?? 1,
      limit: params.limit ?? 24,
      categoryId: params.categoryId,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      minStock: params.minStock,
      sort: params.sort,
    })}`,
    {
      tags: ["search", "products", ...(params.categoryId ? [`category:${params.categoryId}`] : [])],
      revalidate: 60,
    }
  );

  return response ? normalizeSearchResponse(response) : null;
}

export async function fetchCategoryForMetadata(id: string): Promise<Category | null> {
  return safeFetch<Category>(`/categories/${encodeURIComponent(id)}`, {
    tags: ["categories", `category:${id}`],
    revalidate: 600,
  });
}
