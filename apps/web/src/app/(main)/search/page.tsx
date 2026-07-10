import type { Metadata } from "next";
import { SearchPageClient } from "@/features/public-pages/search-page-client";
import { fetchSearchForSSR } from "@/lib/server-api";

type SearchPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function positivePage(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
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

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = (await searchParams) ?? {};
  const query = firstParam(params.q)?.trim() ?? "";
  const initialPage = positivePage(firstParam(params.page));
  const initialSearch = await fetchSearchForSSR({
    q: query,
    page: initialPage,
    limit: 24,
    sort: "createdAt:desc",
  });

  return <SearchPageClient initialSearch={initialSearch ?? undefined} initialPage={initialPage} />;
}
