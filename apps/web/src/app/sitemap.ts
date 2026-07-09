import type { MetadataRoute } from "next";
import { fetchCategoriesForSSR, fetchProductListForSSR } from "@/lib/server-api";
import type { Category, Product } from "@/types/domain";

type SitemapProduct = Product & {
  id?: string;
  updatedAt?: string;
};

type SitemapCategory = Category & {
  id?: string;
  updatedAt?: string;
};

function getBaseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "https://hypermarket.example.com";
  try {
    return new URL(url).origin;
  } catch {
    return "https://hypermarket.example.com";
  }
}

export const revalidate = 3600; // 1h

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();
  const now = new Date();

  // Static public routes – high priority
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/categories`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
  ];

  // Dynamic product URLs
  let productUrls: MetadataRoute.Sitemap = [];
  try {
    // Fetch first 200 products – sitemap chunking can be added later
    const productList = await fetchProductListForSSR({ page: 1, limit: 200 });
    const products = (productList?.items ?? []) as SitemapProduct[];
    // Support both shapes: {items: Product[]} or ProductListResponse
    const list = Array.isArray(products) ? products : [];
    productUrls = list
      .filter((p) => p && (p._id || p.id) && p.isActive !== false)
      .map((p) => ({
        url: `${baseUrl}/products/${p._id ?? p.id}`,
        lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
  } catch {
    // fail silent – sitemap will still serve static routes
  }

  // Category URLs
  let categoryUrls: MetadataRoute.Sitemap = [];
  try {
    const categories = (await fetchCategoriesForSSR()) as SitemapCategory[] | null;
    if (Array.isArray(categories)) {
      categoryUrls = categories
        .filter((c) => c && (c._id || c.id))
        .map((c) => ({
          url: `${baseUrl}/categories/${c._id ?? c.id}`,
          lastModified: (c as SitemapCategory).updatedAt
            ? new Date((c as SitemapCategory).updatedAt as string)
            : now,
          changeFrequency: "weekly" as const,
          priority: 0.6,
        }));
      // Also add /products?categoryId=… search-friendly variants are covered by /products
    }
  } catch {
    // ignore
  }

  return [...staticRoutes, ...categoryUrls, ...productUrls];
}
