"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils";
import { useAnalytics } from "@/hooks/use-analytics";
import { useCategories } from "@/hooks/use-products";
import { useProductSearch } from "@/hooks/use-search";

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const [categoryId, setCategoryId] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sort, setSort] = useState("createdAt:desc");
  const categories = useCategories();
  const { trackSearch } = useAnalytics();
  const search = useProductSearch({
    q: query,
    categoryId: categoryId || undefined,
    minPrice: minPrice || undefined,
    maxPrice: maxPrice || undefined,
    minStock: availableOnly ? "1" : undefined,
    sort,
  });

  useEffect(() => {
    if (query && search.data) {
      trackSearch(query, search.data.length);
    }
  }, [query, search.data, trackSearch]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 text-right">
      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-black">نتایج جستجو</h1>
        <p className="mt-2 text-sm text-slate-500">جستجو برای: <span className="font-bold text-slate-900">{query || "همه محصولات"}</span></p>
        <div className="mt-5 grid gap-3 md:grid-cols-5">
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm">
            <option value="">همه دسته‌بندی‌ها</option>
            {(categories.data ?? []).map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
          </select>
          <Input value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="حداقل قیمت" type="number" />
          <Input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="حداکثر قیمت" type="number" />
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm">
            <option value="createdAt:desc">جدیدترین</option>
            <option value="price:asc">ارزان‌ترین</option>
            <option value="price:desc">گران‌ترین</option>
            <option value="stock:desc">محبوب‌ترین</option>
          </select>
          <Button variant={availableOnly ? "default" : "outline"} onClick={() => setAvailableOnly((value) => !value)}>
            فقط کالاهای موجود
          </Button>
        </div>
      </div>

      {search.isLoading ? <p className="p-8 text-center text-slate-500">در حال جستجو...</p> : null}
      {search.isError ? <p className="p-8 text-center text-red-500">امکان جستجو وجود ندارد.</p> : null}

      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {(search.data ?? []).map((product) => (
          <Card key={product.id} className="overflow-hidden">
            <Link href={`/products/${product.id}`} className="block aspect-square bg-slate-100">
              <div className="flex h-full items-center justify-center text-4xl">🛍️</div>
            </Link>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <Badge>{product.stock > 0 ? "موجود" : "ناموجود"}</Badge>
                <Link href={`/products/${product.id}`} className="line-clamp-2 flex-1 font-bold leading-7">{product.title}</Link>
              </div>
              <p className="mt-2 text-lg font-black text-rose-600">{formatPrice(product.price)}</p>
              <p className="mt-1 text-xs text-slate-500">{product.categoryName}</p>
            </div>
          </Card>
        ))}
      </section>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<main className="p-8 text-center text-slate-500">در حال بارگذاری جستجو...</main>}>
      <SearchContent />
    </Suspense>
  );
}
