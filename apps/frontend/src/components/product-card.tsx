"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatNumber, formatPrice } from "@/lib/utils";
import { useAddToCart } from "@/hooks/use-cart";
import type { Product } from "@/types/domain";

export function ProductCard({ product }: { product: Product }) {
  const addToCart = useAddToCart();
  const price = product.discountPrice ?? product.price;

  return (
    <Card className="overflow-hidden text-right">
      <Link href={`/products/${product._id}`} className="block aspect-square bg-slate-100">
        <div className="flex h-full items-center justify-center text-4xl">🛒</div>
      </Link>
      <div className="p-4">
        <div className="flex flex-row-reverse items-start justify-between gap-2">
          <Badge className={product.stock > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}>
            {product.stock > 0 ? `${formatNumber(product.stock)} عدد` : "ناموجود"}
          </Badge>
          <Link href={`/products/${product._id}`} className="line-clamp-2 flex-1 font-bold leading-7 text-slate-900">
            {product.name}
          </Link>
        </div>
        <p className="mt-2 text-lg font-black text-slate-950">{formatPrice(price)}</p>
        {product.discountPrice && <p className="text-sm text-slate-400 line-through">{formatPrice(product.price)}</p>}
        <Button disabled={product.stock < 1 || addToCart.isPending} onClick={() => addToCart.mutate({ productId: product._id, quantity: 1 })} className="mt-4 w-full">
          <ShoppingCart className="h-4 w-4" /> افزودن به سبد
        </Button>
      </div>
    </Card>
  );
}
