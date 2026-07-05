import type { Metadata } from "next";
import { SearchPageClient } from "@/features/public-pages/search-page-client";

type SearchPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const params = (await searchParams) ?? {};
  const query = firstParam(params.q)?.trim();
  const title = query ? `جستجو برای ${query}` : "جستجوی محصولات";
  const description = query
    ? `نتایج جستجوی محصولات هایپرمارکت برای «${query}».`
    : "جستجو در محصولات هایپرمارکت بر اساس نام، دسته‌بندی، قیمت و موجودی.";

  return {
    title,
    description,
    alternates: { canonical: "/search" },
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}

export default function SearchPage() {
  return <SearchPageClient />;
}
