import type { Metadata } from "next";
import { ProductsPageClient } from "@/features/public-pages/products-page-client";
import { fetchCategoriesForSSR, fetchCategoryForMetadata, fetchProductListForSSR } from "@/lib/server-api";

type ProductsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ searchParams }: ProductsPageProps): Promise<Metadata> {
  const params = (await searchParams) ?? {};
  const categoryId = firstParam(params.category ?? params.categoryId);
  const search = firstParam(params.search ?? params.q);
  const category = categoryId ? await fetchCategoryForMetadata(categoryId) : null;

  const title = category
    ? `محصولات ${category.name}`
    : search
      ? `جستجوی محصولات: ${search}`
      : "محصولات";

  const description = category?.description ||
    "مشاهده و جستجوی محصولات هایپرمارکت، فیلتر دسته‌بندی و بررسی موجودی کالاها.";

  return {
    title,
    description,
    alternates: { canonical: "/products" },
    openGraph: {
      title,
      description,
      type: "website",
      images: category?.image ? [{ url: category.image, alt: category.name }] : undefined,
    },
  };
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = (await searchParams) ?? {};
  const initialCategoryId = firstParam(params.category ?? params.categoryId);
  const initialSearch = firstParam(params.search ?? params.q);

  const [initialProducts, initialCategories] = await Promise.all([
    fetchProductListForSSR({ page: 1, limit: 12, categoryId: initialCategoryId, search: initialSearch }),
    fetchCategoriesForSSR(),
  ]);

  return (
    <ProductsPageClient
      initialCategoryId={initialCategoryId}
      initialSearch={initialSearch}
      initialProducts={initialProducts ?? undefined}
      initialCategories={initialCategories ?? undefined}
    />
  );
}
