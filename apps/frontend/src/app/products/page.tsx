"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-black">Products</h1>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px]">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." />
          <select value={categoryId ?? ""} onChange={(e) => { setCategoryId(e.target.value || undefined); setPage(1); }} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm">
            <option value="">All categories</option>
            {(categories.data ?? []).map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
          </select>
        </div>
      </div>

      {products.isLoading ? <p className="p-8 text-center text-slate-500">Loading products...</p> : null}
      {products.isError ? <p className="p-8 text-center text-red-500">Could not load products.</p> : null}

      <section className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {filteredProducts.map((product) => <ProductCard key={product._id} product={product} />)}
      </section>

      <div className="mt-8 flex items-center justify-center gap-3">
        <Button variant="outline" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
        <span className="text-sm font-semibold">Page {page}</span>
        <Button variant="outline" disabled={(products.data?.items.length ?? 0) < 12} onClick={() => setPage((value) => value + 1)}>Next</Button>
      </div>
    </main>
  );
}
