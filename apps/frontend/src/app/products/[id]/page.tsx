"use client";

import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatNumber, formatPrice } from "@/lib/utils";
import { useAddToCart } from "@/hooks/use-cart";
import { useProduct } from "@/hooks/use-products";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const product = useProduct(params.id);
  const addToCart = useAddToCart();

  if (product.isLoading) return <main className="p-8 text-center text-slate-500">در حال بارگذاری...</main>;
  if (!product.data) return <main className="p-8 text-center text-red-500">محصول پیدا نشد.</main>;

  const item = product.data;
  const price = item.discountPrice ?? item.price;

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 md:grid-cols-2 md:gap-8">
      <div className="aspect-square rounded-3xl bg-white shadow-sm">
        <div className="flex h-full items-center justify-center text-8xl">🛍️</div>
      </div>
      <section className="rounded-3xl bg-white p-6 text-right shadow-sm">
        <Badge className={item.stock > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}>
          {item.stock > 0 ? `${formatNumber(item.stock)} عدد موجود` : "ناموجود"}
        </Badge>
        <h1 className="mt-5 text-3xl font-black leading-tight">{item.name}</h1>
        <p className="mt-4 leading-8 text-slate-600">{item.description}</p>
        <p className="mt-6 text-3xl font-black text-rose-600">{formatPrice(price)}</p>
        {item.discountPrice && <p className="text-slate-400 line-through">{formatPrice(item.price)}</p>}
        <Button disabled={item.stock < 1 || addToCart.isPending} onClick={() => addToCart.mutate({ productId: item._id, quantity: 1 })} className="mt-8 w-full md:w-auto">
          افزودن به سبد خرید
        </Button>
      </section>
    </main>
  );
}
