"use client";

import { motion } from "framer-motion";
import { ArrowRight, Minus, Plus, ShoppingCart, Share2, Heart, Star, Package } from "lucide-react";
import { type Product, getProductById, getProductsByCategory, formatPrice, getDiscountPercent, getCategoryName } from "@/data/mock-data";
import { useMarketStore } from "@/store/market-store";

export function ProductDetailPage() {
  const { currentPage, goBack, navigate, addToCart, updateQuantity, cart } = useMarketStore();

  if (currentPage.type !== "product-detail") return null;

  const product = getProductById(currentPage.productId);
  if (!product) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center text-slate-400">
        <Package size={48} className="mb-4 opacity-30" />
        <p className="text-sm font-semibold">محصول یافت نشد</p>
      </div>
    );
  }

  const cartItem = cart.find((c) => c.product.id === product.id);
  const quantity = cartItem?.quantity ?? 0;
  const relatedProducts = getProductsByCategory(product.categoryId).filter((p) => p.id !== product.id).slice(0, 6);

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Image */}
      <div className="relative aspect-square bg-slate-50">
        <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
        <button onClick={goBack} className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 backdrop-blur shadow-card hover:bg-white transition-colors">
          <ArrowRight size={20} className="text-slate-700" />
        </button>
        <div className="absolute top-4 left-4 flex gap-2">
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 backdrop-blur shadow-card">
            <Heart size={18} className="text-slate-500" />
          </button>
          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 backdrop-blur shadow-card">
            <Share2 size={18} className="text-slate-500" />
          </button>
        </div>
        {product.discountPrice && (
          <span className="absolute bottom-4 left-4 rounded-xl bg-red-500 px-3 py-1.5 text-sm font-bold text-white shadow-lg">
            {getDiscountPercent(product.price, product.discountPrice)}٪ تخفیف
          </span>
        )}
      </div>

      {/* Info */}
      <div className="px-4 pt-5">
        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">{getCategoryName(product.categoryId)}</span>
        <h1 className="mt-3 text-lg font-black text-slate-800 leading-7">{product.name}</h1>

        <div className="mt-2 flex items-center gap-3">
          <span className="text-xs text-slate-400">برند: {product.brand}</span>
          <span className="text-xs text-slate-400">|</span>
          <span className="text-xs text-slate-400">واحد: {product.unit}</span>
        </div>

        {/* Rating placeholder */}
        <div className="mt-3 flex items-center gap-2">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} size={14} className={s <= 4 ? "fill-amber-400 text-amber-400" : "text-slate-200"} />
            ))}
          </div>
          <span className="text-xs text-slate-500">۴.۲ (۸۵ نظر)</span>
        </div>

        {/* Description */}
        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <h3 className="text-sm font-bold text-slate-800 mb-2">توضیحات</h3>
          <p className="text-sm leading-7 text-slate-600">{product.description}</p>
        </div>

        {/* Stock */}
        <div className="mt-3 flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${product.stock > 50 ? "bg-emerald-500" : "bg-amber-500"}`} />
          <span className="text-xs text-slate-500">{product.stock > 50 ? "موجود در انبار" : "موجودی محدود"}</span>
        </div>
      </div>

      {/* Related products */}
      {relatedProducts.length > 0 && (
        <section className="mt-6 px-4">
          <h2 className="text-sm font-bold text-slate-800 mb-3">محصولات مرتبط</h2>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {relatedProducts.map((rp) => (
              <button
                key={rp.id}
                onClick={() => navigate({ type: "product-detail", productId: rp.id })}
                className="min-w-[130px] max-w-[130px] rounded-2xl border border-slate-100 overflow-hidden text-right"
              >
                <div className="relative aspect-square bg-slate-50">
                  <img src={rp.image} alt={rp.name} className="h-full w-full object-cover" loading="lazy" />
                  {rp.discountPrice && (
                    <span className="absolute top-1.5 left-1.5 rounded-md bg-red-500 px-1 py-0.5 text-[9px] font-bold text-white">
                      {getDiscountPercent(rp.price, rp.discountPrice)}٪
                    </span>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-[11px] font-semibold text-slate-700 line-clamp-1">{rp.name}</p>
                  <p className="mt-1 text-xs font-black text-emerald-600">{formatPrice(rp.discountPrice ?? rp.price)}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Fixed bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-100 bg-white/95 backdrop-blur pb-safe">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <div className="flex-1">
            {product.discountPrice && (
              <p className="text-xs text-slate-400 line-through">{formatPrice(product.price)} تومان</p>
            )}
            <p className="text-lg font-black text-emerald-600">
              {formatPrice(product.discountPrice ?? product.price)}
              <span className="mr-1 text-xs font-normal text-slate-400">تومان</span>
            </p>
          </div>
          {quantity === 0 ? (
            <button
              onClick={() => addToCart(product)}
              className="flex items-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-bold text-white shadow-green hover:bg-emerald-600 transition-colors"
            >
              <ShoppingCart size={18} />
              افزودن به سبد
            </button>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl bg-emerald-500 px-2 py-1.5">
              <button onClick={() => updateQuantity(product.id, quantity + 1)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white hover:bg-white/30 transition-colors">
                <Plus size={18} />
              </button>
              <span className="w-8 text-center text-base font-black text-white">{quantity.toLocaleString("fa-IR")}</span>
              {quantity === 1 ? (
                <button onClick={() => updateQuantity(product.id, 0)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white hover:bg-red-500/80 transition-colors">
                  <ShoppingCart size={16} className="opacity-60" />
                </button>
              ) : (
                <button onClick={() => updateQuantity(product.id, quantity - 1)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white hover:bg-white/30 transition-colors">
                  <Minus size={18} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}