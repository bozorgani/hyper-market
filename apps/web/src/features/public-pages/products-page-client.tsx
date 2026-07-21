"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { MobileFilterSheet } from "@/components/ui/mobile-filter-sheet";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories, useProducts } from "@/hooks/use-products";
import { useDebounce } from "@/hooks/use-debounce";
import { getCategoryId } from "@/lib/category-utils";
import { formatNumber } from "@/lib/utils";
import { getUserFacingError } from "@/lib/user-facing-error";
import type { Category, ProductListResponse } from "@/types/domain";

function ProductCardSkeleton() {
  return (
    <Card className="h-full overflow-hidden">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-12 flex-1" />
        </div>
        <Skeleton className="mt-3 h-6 w-32" />
        <Skeleton className="mt-2 h-5 w-24" />
        <Skeleton className="mt-4 h-11 w-full" />
      </div>
    </Card>
  );
}

export function ProductsPageClient({
  initialCategoryId,
  initialSearch,
  initialProducts,
  initialCategories,
}: {
  initialCategoryId?: string;
  initialSearch?: string;
  initialProducts?: ProductListResponse;
  initialCategories?: Category[];
}) {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState(initialSearch ?? "");
  const [categoryId, setCategoryId] = useState<string | undefined>(initialCategoryId);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const debouncedSearch = useDebounce(searchInput, 300);
  const products = useProducts(page, categoryId, debouncedSearch || undefined, page === 1 && categoryId === initialCategoryId && (debouncedSearch || undefined) === (initialSearch || undefined) ? initialProducts : undefined);
  const categories = useCategories(initialCategories);

  const items = products.data?.items ?? [];
  const hasProducts = items.length > 0;

  function resetFilters() {
    setSearchInput("");
    setCategoryId(undefined);
    setPage(1);
  }

  const activeFilterCount = useMemo(() => {
    return (searchInput.trim() ? 1 : 0) + (categoryId ? 1 : 0);
  }, [categoryId, searchInput]);
  const categoriesLoadFailed = categories.isError;
  const productsErrorMessage = getUserFacingError(products.error, "امکان دریافت محصولات وجود ندارد. لطفاً دوباره تلاش کنید.");

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 text-right">
      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <PageHeader
          title="محصولات"
          description="جستجو، فیلتر دسته‌بندی و مشاهده موجودی محصولات"
          badge={
            !products.isLoading && !products.isError && hasProducts ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
                {formatNumber(items.length)} محصول در این صفحه
              </div>
            ) : undefined
          }
        />

        <div className="mt-4 hidden gap-3 md:grid md:grid-cols-[1fr_220px_auto]">
          <Input
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
            placeholder="جستجوی محصول..."
          />
          <select
            value={categoryId ?? ""}
            onChange={(e) => {
              setCategoryId(e.target.value || undefined);
              setPage(1);
            }}
            aria-label="دسته‌بندی"
            className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-right text-sm outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
          >
            <option value="">همه دسته‌بندی‌ها</option>
            {(categories.data ?? []).map((category) => {
              const optionValue = getCategoryId(category);
              if (!optionValue) return null;
              return (
                <option key={optionValue} value={optionValue}>
                  {category.name}
                </option>
              );
            })}
          </select>
          <Button type="button" variant="outline" onClick={resetFilters}>
            پاک‌کردن فیلترها
          </Button>
        </div>
        <div className="mt-4 md:hidden">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="flex min-h-11 w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 transition hover:border-rose-200 hover:bg-rose-50"
          >
            <span>فیلترها</span>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs text-rose-700 shadow-sm">
              {activeFilterCount > 0 ? `${activeFilterCount.toLocaleString("fa-IR")} فعال` : "انتخاب فیلتر"}
            </span>
          </button>
          {activeFilterCount > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {searchInput.trim() ? <span className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">جستجو: {searchInput}</span> : null}
              {categoryId ? <span className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">دسته‌بندی انتخاب‌شده</span> : null}
            </div>
          ) : null}
        </div>
        {categoriesLoadFailed ? <p className="mt-3 text-sm text-amber-600">بارگذاری دسته‌بندی‌ها انجام نشد؛ فعلاً فقط فیلتر نام محصول در دسترس است.</p> : null}
      </div>

      <MobileFilterSheet
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        activeCount={activeFilterCount}
      >
        <Input
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setPage(1);
          }}
          placeholder="جستجوی محصول..."
        />
        <select
          value={categoryId ?? ""}
          onChange={(e) => {
            setCategoryId(e.target.value || undefined);
            setPage(1);
          }}
          aria-label="دسته‌بندی"
          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-right text-sm outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
        >
          <option value="">همه دسته‌بندی‌ها</option>
          {(categories.data ?? []).map((category) => {
            const optionValue = getCategoryId(category);
            if (!optionValue) return null;
            return <option key={optionValue} value={optionValue}>{category.name}</option>;
          })}
        </select>
        <Button type="button" variant="outline" onClick={resetFilters} className="w-full">پاک‌کردن فیلترها</Button>
      </MobileFilterSheet>

      {products.isLoading ? (
        <section className="mt-6 grid grid-cols-2 items-stretch gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" aria-busy="true" aria-label="در حال بارگذاری محصولات">
          <p className="sr-only" role="status" aria-live="polite">در حال بارگذاری محصولات...</p>
          {Array.from({ length: 10 }).map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </section>
      ) : null}

      {!products.isLoading && products.isError ? (
        <div className="mt-6">
          <ErrorState
            title="بارگذاری محصولات انجام نشد"
            description={productsErrorMessage}
            actions={
              <>
                <Button type="button" variant="outline" onClick={() => products.refetch()}>
                  تلاش مجدد
                </Button>
                <Button type="button" onClick={resetFilters}>
                  بازنشانی فیلترها
                </Button>
              </>
            }
          />
        </div>
      ) : null}

      {!products.isLoading && !products.isError && !hasProducts ? (
        <div className="mt-6">
          <EmptyState
            title="محصولی با این فیلتر پیدا نشد"
            description="فیلتر نام یا دسته‌بندی را تغییر دهید تا نتایج بیشتری ببینید."
            actions={<Button type="button" onClick={resetFilters}>پاک‌کردن فیلترها</Button>}
          />
        </div>
      ) : null}

      {!products.isLoading && !products.isError && hasProducts ? (
        <section className="mt-6 grid grid-cols-2 items-stretch gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((product, index) => (
            <ProductCard key={product._id} product={product} priority={page === 1 && index < 6} fetchPriority={page === 1 && index < 4 ? "high" : "auto"} />
          ))}
        </section>
      ) : null}

      <div className="mt-8 flex items-center justify-center gap-3">
        <Button type="button" variant="outline" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
          قبلی
        </Button>
        <span className="text-sm font-semibold">صفحه {formatNumber(page)}</span>
        <Button type="button" variant="outline" disabled={items.length < 12} onClick={() => setPage((value) => value + 1)}>
          بعدی
        </Button>
      </div>
    </main>
  );
}
