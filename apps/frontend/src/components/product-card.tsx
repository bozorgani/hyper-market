"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import { useAddToCart } from "@/hooks/use-cart";
import type { Product } from "@/types/domain";

export function ProductCard({ product }: { product: Product }) {
  const addToCart = useAddToCart();
  const price = product.discountPrice ?? product.price;

  return (
    <Card className="overflow-hidden">
      <Link href={`/products/${product._id}`} className="block aspect-square bg-slate-100">
        <div className="flex h-full items-center justify-center text-4xl">🛒</div>
      </Link>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/products/${product._id}`} className="line-clamp-2 font-bold text-slate-900">{product.name}</Link>
          <Badge className={product.stock > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}>{product.stock > 0 ? "In stock" : "Sold out"}</Badge>
        </div>
        <p className="mt-2 text-lg font-black text-slate-950">{formatPrice(price)}</p>
        {product.discountPrice && <p className="text-sm text-slate-400 line-through">{formatPrice(product.price)}</p>}
        <Button disabled={product.stock < 1 || addToCart.isPending} onClick={() => addToCart.mutate({ productId: product._id, quantity: 1 })} className="mt-4 w-full">
          <ShoppingCart className="mr-2 h-4 w-4" /> Add to cart
        </Button>
      </div>
    </Card>
  );
}
