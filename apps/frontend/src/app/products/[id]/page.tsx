"use client";

import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { useAddToCart } from "@/hooks/use-cart";
import { useProduct } from "@/hooks/use-products";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const product = useProduct(params.id);
  const addToCart = useAddToCart();

  if (product.isLoading) return <main className="p-8 text-center text-slate-500">Loading...</main>;
  if (!product.data) return <main className="p-8 text-center text-red-500">Product not found</main>;

  const item = product.data;
  const price = item.discountPrice ?? item.price;

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-2">
      <div className="aspect-square rounded-3xl bg-white shadow-sm"><div className="flex h-full items-center justify-center text-8xl">🛍️</div></div>
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <Badge className={item.stock > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}>{item.stock > 0 ? `${item.stock} available` : "Sold out"}</Badge>
        <h1 className="mt-5 text-3xl font-black">{item.name}</h1>
        <p className="mt-4 text-slate-600">{item.description}</p>
        <p className="mt-6 text-3xl font-black text-rose-600">{formatPrice(price)}</p>
        {item.discountPrice && <p className="text-slate-400 line-through">{formatPrice(item.price)}</p>}
        <Button disabled={item.stock < 1 || addToCart.isPending} onClick={() => addToCart.mutate({ productId: item._id, quantity: 1 })} className="mt-8 w-full md:w-auto">Add to cart</Button>
      </section>
    </main>
  );
}
