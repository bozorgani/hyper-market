import type { MetadataRoute } from "next";
import { fetchProductListForSSR } from "@/lib/server-api";
import type { Product } from "@/types/domain";

type SitemapProduct = Product & {
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

/**
 * Maximum URLs per sitemap (Google allows up to 50,000).
 * Keeping well under limit for performance.
 */
const MAX_PRODUCTS = 1000;
const PRODUCTS_PER_PAGE = 200;

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

  // Dynamic product URLs — fetch across multiple pages for full catalog coverage
  let productUrls: MetadataRoute.Sitemap = [];
  try {
    const allProducts: SitemapProduct[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && allProducts.length < MAX_PRODUCTS) {
      const productList = await fetchProductListForSSR({
        page,
        limit: PRODUCTS_PER_PAGE,
      });
      const items = (productList?.items ?? []) as SitemapProduct[];
      const list = Array.isArray(items) ? items : [];

      allProducts.push(...list);

      // Stop if this page returned fewer items than requested (last page)
      if (list.length < PRODUCTS_PER_PAGE || !productList?.meta?.hasNextPage) {
        hasMore = false;
      }

      page += 1;
    }

    productUrls = allProducts
      .filter((p) => p && (p._id || p.id) && p.isActive !== false)
      .map((p) => ({
        url: `${baseUrl}/products/${p._id ?? p.id}`,
        lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
  } catch {
    // fail silent — sitemap will still serve static routes
  }

  return [...staticRoutes, ...productUrls];
}
