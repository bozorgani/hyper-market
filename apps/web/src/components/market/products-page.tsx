"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { SlidersHorizontal } from "lucide-react";
import { type Product, categories, products, formatPrice, getDiscountPercent, getProductsByCategory, getCategoryName } from "@/data/mock-data";
import { useMarketStore, type Page } from "@/store/market-store";

type SortOption = "popular" | "cheapest" | "expensive" | "discount";

export function ProductsPage() {
  const { currentPage, navigate, addToCart, searchQuery, setSearchQuery } = useMarketStore();
  const [selectedCat, setSelectedCat] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<SortOption>("popular");
  const [showSort, setShowSort] = useState(false);

  const categoryId = currentPage.type === "products" ? currentPage.categoryId : undefined;
  const activeCat = categoryId ?? selectedCat;
  const query = (currentPage.type === "products" ? currentPage.searchQuery : undefined) ?? searchQuery;

  const filtered = useMemo(() => {
    let result: Product[] = [...products];

    if (activeCat) {
      result = result.filter((p) => p.categoryId === activeCat);
    }
    if (query) {
      const q = query.trim().toLowerCase();
      result = result.filter((p) => p.name.includes(q) || p.brand.includes(q) || p.description.includes(q));
    }

    switch (sort) {
      case "cheapest": result.sort((a, b) => (a.discountPrice ?? a.price) - (b.discountPrice ?? b.price)); break;
      case "expensive": result.sort((a, b) => (b.discountPrice ?? b.price) - (a.discountPrice ?? a.price)); break;
      case "discount": result.sort((a, b) => (a.discountPrice ? (a.price - a.discountPrice) / a.price : 0) - (b.discountPrice ? (b.price - b.discountPrice) / b.price : 0)); break;
    }

    return result;
  }, [activeCat, query, sort]);

  const sortLabels: Record<SortOption, string> = {
    popular: "محبوب‌ترین",
    cheapest: "ارزان‌ترین",
    expensive: "گران‌ترین",
    discount: "بیشترین تخفیف",
  };

  const title = activeCat ? getCategoryName(activeCat) : query ? `نتایج جستجو: ${query}` : "همه محصولات";

  return (
    <div className="min-h-screen bg-slate-50/80 pb-20">
      <div className="sticky top-14 z-30 bg-slate-50/90 backdrop-blur">
        <div className="px-4 pt-4 pb-2">
          <h1 className="text-lg font-black text-slate-800">{title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{filtered.length.toLocaleString("fa-IR")} محصول</p>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-3">
          <button
            onClick={() => setSelectedCat(undefined)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${!activeCat ? "bg-emerald-500 text-white shadow-green" : "bg-white text-slate-600 shadow-card"}`}
          >
            همه
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id === activeCat ? undefined : cat.id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${cat.id === activeCat ? "bg-emerald-500 text-white shadow-green" : "bg-white text-slate-600 shadow-card"}`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 px-4 pb-3">
          <button onClick={() => setShowSort(!showSort)} className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-card">
            <SlidersHorizontal size={14} />
            <span>{sortLabels[sort]}</span>
          </button>
        </div>
        {showSort && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-3">
            {(Object.keys(sortLabels) as SortOption[]).map((s) => (
              <button
                key={s}
                onClick={() => { setSort(s); setShowSort(false); }}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${sort === s ? "bg-emerald-500 text-white" : "bg-white text-slate-600 shadow-card"}`}
              >
                {sortLabels[s]}
              </button>
            ))}
          </motion.div>
        )}
      </div>

      <div className="px-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <span className="text-5xl mb-4">🔍</span>
            <p className="text-sm font-semibold">محصولی یافت نشد</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="rounded-2xl bg-white shadow-card overflow-hidden"
              >
                <button onClick={() => navigate({ type: "product-detail", productId: product.id })} className="w-full text-right">
                  <div className="relative aspect-square bg-slate-50">
                    <img src={product.image} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
                    {product.discountPrice && (
                      <span className="absolute top-2 left-2 rounded-lg bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {getDiscountPercent(product.price, product.discountPrice)}٪
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-semibold text-slate-800 line-clamp-2 leading-5 min-h-[2.5rem]">{product.name}</p>
                    <div className="mt-2 flex items-end justify-between gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                      >
                        <span className="text-lg leading-none">+</span>
                      </button>
                      <div className="text-left">
                        {product.discountPrice && (
                          <p className="text-[10px] text-slate-400 line-through">{formatPrice(product.price)}</p>
                        )}
                        <p className="text-sm font-black text-emerald-600">
                          {formatPrice(product.discountPrice ?? product.price)}
                          <span className="mr-0.5 text-[10px] font-normal text-slate-400">تومان</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}