import type { Metadata } from "next";
import { HomePageClient } from "@/features/public-pages/home-page-client";
import { fetchCategoriesForSSR, fetchProductListForSSR } from "@/lib/server-api";

export const metadata: Metadata = {
  title: "هایپرمارکت | فروشگاه آنلاین",
  description: "خرید آنلاین محصولات هایپرمارکت با تجربه فارسی، ارسال سریع و قیمت مناسب.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [initialProducts, initialCategories] = await Promise.all([
    fetchProductListForSSR({ page: 1, limit: 12 }),
    fetchCategoriesForSSR(),
  ]);

  return (
    <HomePageClient
      initialProducts={initialProducts ?? undefined}
      initialCategories={initialCategories ?? undefined}
    />
  );
}
