"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShoppingCart, Tag } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useAddToCart } from "@/hooks/use-cart";
import { formatNumber, formatPrice } from "@/lib/utils";
import type { Product } from "@/types/domain";

export function ProductCard({ product }: { product: Product }) {
  const addToCart = useAddToCart();
  const { showToast } = useToast();
  const price = product.discountPrice ?? product.price;
  const discountPercent = product.discountPrice && product.price > 0
    ? Math.max(0, Math.round(((product.price - product.discountPrice) / product.price) * 100))
    : 0;

  async function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await addToCart.mutateAsync({ productId: product._id, quantity: 1 });
      showToast({ type: "success", title: "به سبد اضافه شد" });
    } catch (error) {
      showToast({ type: "error", title: "افزودن ناموفق", description: error instanceof Error ? error.message : undefined });
    }
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Image */}
      <Link href={`/products/${product._id}`} className="relative block aspect-square bg-slate-50 overflow-hidden">
        {product.images?.[0] ? (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            unoptimized
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">🛒</div>
        )}
        {/* Discount Badge */}
        {discountPercent > 0 && (
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-lg bg-red-500 px-2 py-1 text-white shadow-sm">
            <Tag className="h-3 w-3" />
            <span className="text-[11px] font-bold">{formatNumber(discountPercent)}%</span>
          </div>
        )}
        {/* Stock Status */}
        {product.stock < 1 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm">
            <span className="rounded-xl bg-red-500 px-3 py-1.5 text-xs font-bold text-white">ناموجود</span>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        {/* Stock */}
        {product.stock > 0 && product.stock < 10 && (
          <p className="text-[10px] font-semibold text-amber-600 mb-1.5">فقط {formatNumber(product.stock)} عدد باقیمانده!</p>
        )}

        {/* Name */}
        <Link href={`/products/${product._id}`} className="line-clamp-2 text-sm font-bold leading-6 text-slate-800 transition group-hover:text-emerald-700">
          {product.name}
        </Link>

        {/* Brand + Unit */}
        {(product.brand || product.unit) ? (
          <div className="mt-1 flex items-center gap-1.5">
            {product.brand ? (
              <span className="text-[10px] font-semibold text-slate-400">{product.brand}</span>
            ) : null}
            {product.brand && product.unit ? (
              <span className="text-slate-300">·</span>
            ) : null}
            {product.unit ? (
              <span className="text-[10px] text-slate-400">هر {product.unit}</span>
            ) : null}
          </div>
        ) : null}

        {/* Price */}
        <div className="mt-auto pt-3">
          {discountPercent > 0 && (
            <p className="text-xs text-slate-400 line-through">{formatPrice(product.price)}</p>
          )}
          <div className="flex items-end justify-between gap-2">
            <p className="text-base font-black text-slate-900 sm:text-lg">{formatPrice(price)}</p>
            <p className="text-[10px] text-slate-400">تومان</p>
          </div>
        </div>

        {/* Add to Cart */}
        <button
          onClick={handleAddToCart}
          disabled={product.stock < 1 || addToCart.isPending}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-50 py-2.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98]"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          {addToCart.isPending ? "..." : "افزودن به سبد"}
        </button>
      </div>
    </motion.div>
  );
}