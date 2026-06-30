"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

  async function handleAddToCart() {
    try {
      await addToCart.mutateAsync({ productId: product._id, quantity: 1 });
      showToast({ type: "success", title: "محصول به سبد خرید اضافه شد" });
    } catch (error) {
      showToast({
        type: "error",
        title: "افزودن محصول ناموفق بود",
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <Card className="overflow-hidden text-right">
      <Link href={`/products/${product._id}`} className="block aspect-square bg-slate-100">
        <div className="flex h-full items-center justify-center text-4xl">🛒</div>
      </Link>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <Badge className={product.stock > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}>
            {product.stock > 0 ? `${formatNumber(product.stock)} عدد` : "ناموجود"}
          </Badge>
          <Link href={`/products/${product._id}`} className="line-clamp-2 flex-1 font-bold leading-7 text-slate-900">
            {product.name}
          </Link>
        </div>
        {discountPercent > 0 ? <Badge className="mt-3 bg-rose-50 text-rose-700">{formatNumber(discountPercent)}٪ تخفیف</Badge> : null}
        <p className="mt-2 text-lg font-black text-slate-950">{formatPrice(price)}</p>
        {product.discountPrice ? <p className="text-sm text-slate-400 line-through">{formatPrice(product.price)}</p> : null}
        <Button type="button" disabled={product.stock < 1 || addToCart.isPending} onClick={handleAddToCart} className="mt-4 w-full">
          <ShoppingCart className="h-4 w-4" />
          {addToCart.isPending ? "در حال افزودن..." : "افزودن به سبد"}
        </Button>
      </div>
    </Card>
  );
}
