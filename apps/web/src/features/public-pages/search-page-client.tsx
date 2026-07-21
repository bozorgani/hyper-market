"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { MobileFilterSheet } from "@/components/ui/mobile-filter-sheet";
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
import { formatNumber } from "@/lib/utils";
import { getUserFacingError } from "@/lib/user-facing-error";
import type { Product } from "@/types/domain";

function SearchResultsSkeleton() {
  return (
    <section className="mt-6 grid grid-cols-2 items-stretch gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" aria-busy="true" aria-label="در حال بارگذاری نتایج جستجو">
      <p className="sr-only" role="status" aria-live="polite">در حال بارگذاری نتایج جستجو...</p>
      {Array.from({ length: 10 }).map((_, index) => (
        <Card key={index} className="h-full overflow-hidden rounded-2xl border-slate-100">
          <Skeleton className="aspect-square w-full rounded-none" />
          <div className="space-y-3 p-3.5 sm:p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-11 w-full rounded-2xl" />
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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
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

  const searchErrorMessage = getUserFacingError(search.error, "امکان جستجو وجود ندارد. لطفاً دوباره تلاش کنید.");
  const hasResults = (search.data?.items.length ?? 0) > 0;
  const activeFilterCount = [categoryId, minPrice, maxPrice, availableOnly ? "available" : "", sort !== "createdAt:desc" ? sort : ""].filter(Boolean).length;

  function toProductCardProduct(searchProduct: NonNullable<SearchResponse["items"]>[number]): Product {
    const effectivePrice = searchProduct.effectivePrice ?? searchProduct.discountPrice;
    const hasDiscount = typeof effectivePrice === "number" && effectivePrice < searchProduct.price;

    return {
      _id: searchProduct.id,
      name: searchProduct.name,
      description: searchProduct.description ?? "",
      price: searchProduct.price,
      discountPrice: hasDiscount ? effectivePrice : null,
      stock: searchProduct.stock,
      images: searchProduct.images ?? [],
      categoryId: searchProduct.categoryId ?? "search",
      isActive: true,
      brand: searchProduct.brand,
      tags: searchProduct.tags,
    };
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 text-right">
      <div className="rounded-2xl bg-white p-5 shadow-sm">
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

        <div className="mt-5 hidden gap-3 md:grid md:grid-cols-5">
          <select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }} aria-label="دسته‌بندی" className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm">
            <option value="">همه دسته‌بندی‌ها</option>
            {(categories.data ?? []).map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
          <Input value={minPrice} onChange={(e) => { setMinPrice(e.target.value); setPage(1); }} placeholder="حداقل قیمت" type="number" />
          <Input value={maxPrice} onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }} placeholder="حداکثر قیمت" type="number" />
          <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} aria-label="مرتب‌سازی" className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm">
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
        <div className="mt-4 md:hidden">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="flex min-h-11 w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 transition hover:border-rose-200 hover:bg-rose-50"
          >
            <span>فیلترها و مرتب‌سازی</span>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs text-rose-700 shadow-sm">
              {activeFilterCount > 0 ? `${activeFilterCount.toLocaleString("fa-IR")} فعال` : "انتخاب فیلتر"}
            </span>
          </button>
          {activeFilterCount > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {categoryId ? <span className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">دسته‌بندی</span> : null}
              {minPrice || maxPrice ? <span className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">محدوده قیمت</span> : null}
              {availableOnly ? <span className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">فقط موجود</span> : null}
              {sort !== "createdAt:desc" ? <span className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">مرتب‌سازی</span> : null}
            </div>
          ) : null}
        </div>
      </div>

      <MobileFilterSheet
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        title="فیلتر و مرتب‌سازی"
        activeCount={activeFilterCount}
      >
        <select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }} aria-label="دسته‌بندی" className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
          <option value="">همه دسته‌بندی‌ها</option>
          {(categories.data ?? []).map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <Input value={minPrice} onChange={(e) => { setMinPrice(e.target.value); setPage(1); }} placeholder="حداقل قیمت" type="number" />
          <Input value={maxPrice} onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }} placeholder="حداکثر قیمت" type="number" />
        </div>
        <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} aria-label="مرتب‌سازی" className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
          <option value="createdAt:desc">جدیدترین</option>
          <option value="price:asc">ارزان‌ترین</option>
          <option value="price:desc">گران‌ترین</option>
          <option value="stock:desc">موجودترین</option>
        </select>
        <Button type="button" variant={availableOnly ? "default" : "outline"} onClick={() => { setAvailableOnly((value) => !value); setPage(1); }} className="w-full">
          فقط کالاهای موجود
        </Button>
        <Button type="button" variant="outline" onClick={resetFilters} className="w-full">پاک‌کردن فیلترها</Button>
      </MobileFilterSheet>

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
        <section className="mt-6 grid grid-cols-2 items-stretch gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {(search.data?.items ?? []).map((product, index) => (
            <ProductCard
              key={product.id}
              product={toProductCardProduct(product)}
              priority={page === 1 && index < 6}
              fetchPriority={page === 1 && index < 4 ? "high" : "auto"}
            />
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
