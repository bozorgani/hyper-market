"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShoppingCart, Tag } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useAddToCart } from "@/hooks/use-cart";
import { useAuthStore } from "@/store/auth-store";
import { formatNumber, formatPrice } from "@/lib/utils";
import type { Product } from "@/types/domain";

export function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const addToCart = useAddToCart();
  const { showToast } = useToast();
  const price = product.discountPrice ?? product.price;
  const discountPercent = product.discountPrice && product.price > 0
    ? Math.max(0, Math.round(((product.price - product.discountPrice) / product.price) * 100))
    : 0;

  async function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      showToast({ type: "info", title: "برای افزودن به سبد خرید ابتدا وارد شوید" });
      router.push("/login");
      return;
    }
    if (user.role !== "customer" && user.role !== "CUSTOMER") {
      showToast({ type: "error", title: "سبد خرید فقط برای حساب مشتری فعال است" });
      return;
    }
    try {
      await addToCart.mutateAsync({ productId: product._id, quantity: 1 });
      showToast({ type: "success", title: "به سبد خرید اضافه شد" });
    } catch (error) {
      showToast({ type: "error", title: "افزودن ناموفق", description: error instanceof Error ? error.message : undefined });
    }
  }

  return (
    <motion.div
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 260, damping: 25 }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all duration-200 hover:shadow-lg focus-within:ring-2 focus-within:ring-emerald-200 focus-within:ring-offset-2"
    >
      <Link 
        href={`/products/${product._id}`} 
        className="relative block aspect-square bg-slate-50 overflow-hidden"
        aria-label={`مشاهده جزئیات ${product.name}`}
      >
        {product.images?.[0] ? (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl bg-slate-100">🛒</div>
        )}

        {discountPercent > 0 && (
          <div className="absolute top-3 right-3 flex items-center gap-1 rounded-xl bg-red-500 px-2.5 py-1 text-white shadow-md">
            <Tag className="h-3 w-3" />
            <span className="text-[11px] font-bold">{formatNumber(discountPercent)}%</span>
          </div>
        )}

        {product.stock < 1 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <span className="rounded-2xl bg-white/95 px-4 py-1.5 text-xs font-bold text-red-600 shadow">ناموجود</span>
          </div>
        )}

        {product.stock > 0 && product.stock < 6 && (
          <div className="absolute bottom-3 right-3 rounded-xl bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">فقط {formatNumber(product.stock)} باقی</div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <Link href={`/products/${product._id}`} className="line-clamp-2 text-sm font-bold leading-tight text-slate-900 transition-colors group-hover:text-emerald-700">
          {product.name}
        </Link>

        {(product.brand || product.unit) && (
          <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
            {product.brand && <span className="font-medium">{product.brand}</span>}
            {product.brand && product.unit && <span className="text-slate-300">·</span>}
            {product.unit && <span>{product.unit}</span>}
          </div>
        )}

        <div className="mt-auto pt-3 flex items-baseline justify-between gap-2">
          <div>
            {discountPercent > 0 && (
              <p className="text-xs text-slate-400 line-through">{formatPrice(product.price)}</p>
            )}
            <p className="text-[15px] font-black text-slate-900">{formatPrice(price)}</p>
          </div>
          <span className="text-[10px] font-medium text-slate-400">تومان</span>
        </div>

        <button
          onClick={handleAddToCart}
          disabled={product.stock < 1 || addToCart.isPending}
          aria-label={`افزودن ${product.name} به سبد خرید`}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-emerald-50 py-[9px] text-xs font-bold text-emerald-700 transition-all hover:bg-emerald-100 active:bg-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          {addToCart.isPending ? "در حال افزودن..." : "افزودن به سبد"}
        </button>
      </div>
    </motion.div>
  );
}
