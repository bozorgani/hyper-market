"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Flame, Zap, Clock } from "lucide-react";
import { type Product, categories, products, banners, getOfferProducts, formatPrice, getDiscountPercent } from "@/data/mock-data";
import { useMarketStore } from "@/store/market-store";

export function HomePage() {
  const { navigate, addToCart } = useMarketStore();
  const [bannerIdx, setBannerIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setBannerIdx((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const offerProducts = getOfferProducts();
  const popularProducts = products.slice(0, 8);

  return (
    <div className="min-h-screen bg-slate-50/80 pb-20">
      {/* Banners */}
      <div className="relative mx-4 mt-4 overflow-hidden rounded-2xl">
        <motion.div
          className="flex"
          animate={{ x: `-${bannerIdx * 100}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {banners.map((banner) => (
            <div key={banner.id} className={`min-w-full bg-gradient-to-l ${banner.bg} p-6 text-white`}>
              <div className="flex items-center justify-between">
                <div className="text-right">
                  <h2 className="text-xl font-black">{banner.title}</h2>
                  <p className="mt-1 text-sm text-white/80">{banner.subtitle}</p>
                  <button onClick={() => navigate({ type: "products" })} className="mt-3 rounded-xl bg-white/20 px-4 py-2 text-xs font-semibold backdrop-blur-sm hover:bg-white/30 transition-colors">
                    مشاهده
                  </button>
                </div>
                <span className="text-6xl">{banner.emoji}</span>
              </div>
            </div>
          ))}
        </motion.div>
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {banners.map((_, i) => (
            <button key={i} onClick={() => setBannerIdx(i)} className={`h-1.5 rounded-full transition-all ${i === bannerIdx ? "w-6 bg-white" : "w-1.5 bg-white/50"}`} />
          ))}
        </div>
      </div>

      {/* Categories */}
      <section className="mt-6">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="text-base font-black text-slate-800">دسته‌بندی‌ها</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => navigate({ type: "products", categoryId: cat.id })}
              className="flex flex-col items-center gap-2 min-w-[72px]"
            >
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl shadow-card"
                style={{ backgroundColor: cat.color + "18" }}
              >
                {cat.icon}
              </div>
              <span className="text-[11px] font-semibold text-slate-600 leading-tight text-center max-w-[72px]">
                {cat.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Quick promo row */}
      <section className="mt-6 px-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Flame, label: "پرفروش‌ترین‌ها", color: "bg-red-50 text-red-600" },
            { icon: Zap, label: "ارسال فوری", color: "bg-amber-50 text-amber-600" },
            { icon: Clock, label: "تازه‌ترین‌ها", color: "bg-emerald-50 text-emerald-600" },
          ].map(({ icon: Icon, label, color }) => (
            <div key={label} className={`flex flex-col items-center gap-2 rounded-2xl p-3 ${color}`}>
              <Icon size={22} />
              <span className="text-[11px] font-bold">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Offers */}
      <ProductSection title="تخفیف‌های ویژه" products={offerProducts.slice(0, 8)} navigate={navigate} addToCart={addToCart} />

      {/* Popular */}
      <ProductSection title="محبوب‌ترین‌ها" products={popularProducts} navigate={navigate} addToCart={addToCart} />
    </div>
  );
}

function ProductSection({ title, products, navigate, addToCart }: {
  title: string;
  products: Product[];
  navigate: (p: import("@/store/market-store").Page) => void;
  addToCart: (p: Product) => void;
}) {
  return (
    <section className="mt-6">
      <div className="flex items-center justify-between px-4 mb-3">
        <h2 className="text-base font-black text-slate-800">{title}</h2>
        <button onClick={() => navigate({ type: "products" })} className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
          <span>مشاهده همه</span>
          <ChevronLeft size={14} />
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-1">
        {products.map((product) => (
          <div key={product.id} className="min-w-[160px] max-w-[160px] rounded-2xl bg-white shadow-card overflow-hidden">
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
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(product);
                    }}
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
          </div>
        ))}
      </div>
    </section>
  );
}