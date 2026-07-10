"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { useAnalytics } from "@/hooks/use-analytics";
import { useDebounce } from "@/hooks/use-debounce";
import { useCategories } from "@/hooks/use-products";
import { useProductSearch, type SearchResponse } from "@/hooks/use-search";
import { formatNumber, formatPrice } from "@/lib/utils";

function SearchResultsSkeleton() {
  return (
    <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <Card key={index} className="overflow-hidden">
          <Skeleton className="aspect-square w-full rounded-none" />
          <div className="p-4">
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-12 flex-1" />
            </div>
            <Skeleton className="mt-3 h-6 w-28" />
            <Skeleton className="mt-2 h-4 w-24" />
          </div>
        </Card>
      ))}
    </section>
  );
}

function SearchContent({
  initialSearch,
  initialPage,
}: {
  initialSearch?: SearchResponse;
  initialPage: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const previousQueryRef = useRef(query);
  const [page, setPage] = useState(initialPage);
  const [categoryId, setCategoryId] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sort, setSort] = useState("createdAt:desc");
  const categories = useCategories();
  const { trackSearch } = useAnalytics();
  const debouncedMinPrice = useDebounce(minPrice, 400);
  const debouncedMaxPrice = useDebounce(maxPrice, 400);
  const searchParamsForQuery = {
    q: query,
    categoryId: categoryId || undefined,
    minPrice: debouncedMinPrice || undefined,
    maxPrice: debouncedMaxPrice || undefined,
    minStock: availableOnly ? "1" : undefined,
    sort,
    page,
    limit: 24,
  };
  const canUseInitialSearch =
    page === initialPage &&
    !categoryId &&
    !debouncedMinPrice &&
    !debouncedMaxPrice &&
    !availableOnly &&
    sort === "createdAt:desc";
  const search = useProductSearch(searchParamsForQuery, canUseInitialSearch ? initialSearch : undefined);

  useEffect(() => {
    if (previousQueryRef.current !== query) {
      previousQueryRef.current = query;
      setPage(1);
    }
  }, [query]);

  useEffect(() => {
    if (query && search.data) {
      trackSearch(query, search.data.total);
    }
  }, [query, search.data, trackSearch]);

  function resetFilters() {
    setCategoryId("");
    setMinPrice("");
    setMaxPrice("");
    setAvailableOnly(false);
    setSort("createdAt:desc");
    setPage(1);
  }

  function changePage(nextPage: number) {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const searchErrorMessage = search.error instanceof Error ? search.error.message : "امکان جستجو وجود ندارد.";
  const hasResults = (search.data?.items.length ?? 0) > 0;

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 text-right">
      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <PageHeader
          title="نتایج جستجو"
          description={`جستجو برای: ${query || "همه محصولات"}`}
          badge={
            !search.isLoading && !search.isError ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
                {formatNumber(search.data?.total ?? 0)} نتیجه
              </div>
            ) : undefined
          }
        />

        <div className="mt-5 grid gap-3 md:grid-cols-5">
          <select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }} className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm">
            <option value="">همه دسته‌بندی‌ها</option>
            {(categories.data ?? []).map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
          <Input value={minPrice} onChange={(e) => { setMinPrice(e.target.value); setPage(1); }} placeholder="حداقل قیمت" type="number" />
          <Input value={maxPrice} onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }} placeholder="حداکثر قیمت" type="number" />
          <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm">
            <option value="createdAt:desc">جدیدترین</option>
            <option value="price:asc">ارزان‌ترین</option>
            <option value="price:desc">گران‌ترین</option>
            <option value="stock:desc">موجودترین</option>
          </select>
          <Button type="button" variant={availableOnly ? "default" : "outline"} onClick={() => { setAvailableOnly((value) => !value); setPage(1); }}>
            فقط کالاهای موجود
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={resetFilters}>
            پاک‌کردن فیلترها
          </Button>
          {query ? (
            <Button type="button" variant="ghost" onClick={() => router.push("/search")}>
              حذف متن جستجو
            </Button>
          ) : null}
        </div>
      </div>

      {search.isLoading ? <SearchResultsSkeleton /> : null}

      {!search.isLoading && search.isError ? (
        <div className="mt-6">
          <ErrorState
            title="جستجو در حال حاضر در دسترس نیست"
            description={searchErrorMessage}
            actions={
              <>
                <Button type="button" variant="outline" onClick={() => search.refetch()}>
                  تلاش مجدد
                </Button>
                <LinkButton href="/products">مشاهده همه محصولات</LinkButton>
              </>
            }
          />
        </div>
      ) : null}

      {!search.isLoading && !search.isError && !hasResults ? (
        <div className="mt-6">
          <EmptyState
            title="نتیجه‌ای برای این جستجو پیدا نشد"
            description="عبارت جستجو یا فیلترهای قیمت و دسته‌بندی را تغییر دهید تا نتایج بیشتری ببینید."
            actions={
              <>
                <Button type="button" onClick={resetFilters}>پاک‌کردن فیلترها</Button>
                <LinkButton href="/products" variant="outline">بازگشت به محصولات</LinkButton>
              </>
            }
          />
        </div>
      ) : null}

      {!search.isLoading && !search.isError && hasResults ? (
        <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {(search.data?.items ?? []).map((product) => (
            <Card key={product.id} className="overflow-hidden text-right">
              <Link href={`/products/${product.id}`} className="block aspect-square bg-slate-100">
                <div className="flex h-full items-center justify-center text-4xl">🛍️</div>
              </Link>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <Badge className={product.stock > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}>
                    {product.stock > 0 ? "موجود" : "ناموجود"}
                  </Badge>
                  <Link href={`/products/${product.id}`} className="line-clamp-2 flex-1 font-bold leading-7 text-slate-900">
                    {product.name}
                  </Link>
                </div>
                <p className="mt-2 text-lg font-black text-rose-600">{formatPrice(product.effectivePrice ?? product.discountPrice ?? product.price)}</p>
                {product.discountPrice && product.discountPrice < product.price ? (
                  <p className="text-sm text-slate-400 line-through">{formatPrice(product.price)}</p>
                ) : null}
                <p className="mt-1 text-xs text-slate-500">{product.categoryName}</p>
              </div>
            </Card>
          ))}
        </section>
      ) : null}

      {!search.isLoading && !search.isError && search.data?.meta ? (
        <Pagination
          page={page}
          totalPages={search.data.meta.totalPages}
          totalItems={search.data.total}
          pageSize={search.data.limit}
          onPageChange={changePage}
        />
      ) : null}
    </main>
  );
}

export function SearchPageClient({
  initialSearch,
  initialPage = 1,
}: {
  initialSearch?: SearchResponse;
  initialPage?: number;
}) {
  return (
    <Suspense fallback={<main className="p-8 text-center text-slate-500">در حال بارگذاری جستجو...</main>}>
      <SearchContent initialSearch={initialSearch} initialPage={initialPage} />
    </Suspense>
  );
}
