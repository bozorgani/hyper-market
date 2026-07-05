import type { Category, Product } from "@/types/domain";

function getServerApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.PUBLIC_API_BASE_URL;
  if (configured?.startsWith("http")) {
    return configured.replace(/\/$/, "");
  }

  return "http://localhost:3001/api/v1";
}

export async function fetchProductForMetadata(id: string): Promise<Product | null> {
  try {
    const response = await fetch(`${getServerApiBaseUrl()}/products/${encodeURIComponent(id)}`, {
      next: { revalidate: 300 },
    });
    if (!response.ok) return null;
    return (await response.json()) as Product;
  } catch {
    return null;
  }
}

export async function fetchCategoryForMetadata(id: string): Promise<Category | null> {
  try {
    const response = await fetch(`${getServerApiBaseUrl()}/categories/${encodeURIComponent(id)}`, {
      next: { revalidate: 300 },
    });
    if (!response.ok) return null;
    return (await response.json()) as Category;
  } catch {
    return null;
  }
}
