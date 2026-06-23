"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNumber } from "@/lib/utils";
import { useCategories, useProducts } from "@/hooks/use-products";

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const products = useProducts(page, categoryId);
  const categories = useCategories();

  const filteredProducts = useMemo(() => {
    const items = products.data?.items ?? [];
    if (!search.trim()) return items;
    return items.filter((product) => product.name.toLowerCase().includes(search.toLowerCase()));
  }, [products.data?.items, search]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="rounded-3xl bg-white p-5 text-right shadow-sm">
        <h1 className="text-2xl font-black">محصولات</h1>
        <p className="mt-2 text-sm text-slate-500">جستجو، فیلتر دسته‌بندی و مشاهده موجودی محصولات</p>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px]">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجوی محصول..." />
          <select value={categoryId ?? ""} onChange={(e) => { setCategoryId(e.target.value || undefined); setPage(1); }} className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-right text-sm outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100">
            <option value="">همه دسته‌بندی‌ها</option>
            {(categories.data ?? []).map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
          </select>
        </div>
      </div>

      {products.isLoading ? <p className="p-8 text-center text-slate-500">در حال بارگذاری محصولات...</p> : null}
      {products.isError ? <p className="p-8 text-center text-red-500">امکان دریافت محصولات وجود ندارد.</p> : null}

      <section className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {filteredProducts.map((product) => <ProductCard key={product._id} product={product} />)}
      </section>

      <div className="mt-8 flex items-center justify-center gap-3">
        <Button variant="outline" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>قبلی</Button>
        <span className="text-sm font-semibold">صفحه {formatNumber(page)}</span>
        <Button variant="outline" disabled={(products.data?.items.length ?? 0) < 12} onClick={() => setPage((value) => value + 1)}>بعدی</Button>
      </div>
    </main>
  );
}
