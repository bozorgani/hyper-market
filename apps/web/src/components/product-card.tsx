"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, Tag } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useAddToCart } from "@/hooks/use-cart";
import { useAuthStore } from "@/store/auth-store";
import { formatNumber, formatPrice } from "@/lib/utils";
import { getProductImageUrl, isKnownOptimizedImageSource } from "@/lib/image-utils";
import { WishlistButton } from "@/components/wishlist-button";
import type { Product } from "@/types/domain";
// i18n – Issue #24
import { t, tf } from "@/i18n";

export function ProductCard({
  product,
  priority = false,
  fetchPriority,
}: {
  product: Product;
  priority?: boolean;
  fetchPriority?: "high" | "low" | "auto";
}) {
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
      showToast({ type: "info", title: t('auth.loginRequiredCart') });
      router.push("/login");
      return;
    }
    if (user.role !== "customer" && user.role !== "CUSTOMER") {
      showToast({ type: "error", title: t('auth.customerOnlyCart') });
      return;
    }
    try {
      await addToCart.mutateAsync({ productId: product._id, quantity: 1 });
      showToast({ type: "success", title: t('common.addedToCart') });
    } catch (error) {
      showToast({ type: "error", title: t('common.addToCartFailed'), description: error instanceof Error ? error.message : undefined });
    }
  }

  return (
    <div
      className="group product-card relative flex h-full min-h-[var(--card-product-min-h)] flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-[3px] hover:shadow-lg active:scale-[0.985] focus-within:ring-2 focus-visible:outline-none sm:min-h-[var(--card-product-min-h-sm)]"
    >
      <div className="absolute left-3 top-3 z-10">
        <WishlistButton
          productId={product._id}
          size="sm"
          className="border border-slate-100/80"
        />
      </div>
      <Link
        href={`/products/${product._id}`}
        className="relative block aspect-square bg-slate-50 overflow-hidden"
        aria-label={tf('product.detailAriaLabel', { name: product.name })}
      >
        {product.images?.[0] ? (
          <Image
            src={getProductImageUrl(product.images[0])}
            alt={product.name}
            unoptimized={!isKnownOptimizedImageSource(getProductImageUrl(product.images[0]))}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
            quality={80}
            priority={priority}
            fetchPriority={fetchPriority ?? (priority ? "high" : "auto")}
            loading={priority ? undefined : "lazy"}
            decoding="async"
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx4f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
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
            <span className="rounded-2xl bg-white/95 px-4 py-1.5 text-xs font-bold text-red-600 shadow">{t('common.outOfStock')}</span>
          </div>
        )}

        {product.stock > 0 && product.stock < 6 && (
          <div className="absolute bottom-3 right-3 rounded-xl bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
            {tf('common.lowStock', { count: product.stock })}
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <Link href={`/products/${product._id}`} className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-5 text-slate-900 transition-colors group-hover:text-emerald-700">
          {product.name}
        </Link>

        <div className="mt-1 flex min-h-4 items-center gap-1 text-[10px] text-slate-400">
          {product.brand && <span className="truncate font-medium">{product.brand}</span>}
          {product.brand && product.unit && <span className="shrink-0 text-slate-300">·</span>}
          {product.unit && <span className="shrink-0">{product.unit}</span>}
        </div>

        <div className="mt-auto pt-3 flex items-baseline justify-between gap-2">
          <div>
            {discountPercent > 0 && (
              <p className="text-xs text-slate-400 line-through">{formatPrice(product.price)}</p>
            )}
            <p className="text-[15px] font-black text-slate-900">{formatPrice(price)}</p>
          </div>
          <span className="text-[10px] font-medium text-slate-400">{t('common.currency')}</span>
        </div>

        <button
          onClick={handleAddToCart}
          disabled={product.stock < 1 || addToCart.isPending}
          aria-label={tf('product.addToCartAriaLabel', { name: product.name })}
          className="mt-3 flex min-h-[var(--touch-target-min)] w-full items-center justify-center gap-1.5 rounded-2xl bg-emerald-50 py-[9px] text-xs font-bold text-emerald-700 transition-all hover:bg-emerald-100 active:bg-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
          {addToCart.isPending ? t('common.adding') : t('common.addToCart')}
        </button>
      </div>
    </div>
  );
}
