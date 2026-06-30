"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useAnalytics } from "@/hooks/use-analytics";
import { useAddToCart } from "@/hooks/use-cart";
import { useProduct } from "@/hooks/use-products";
import { formatNumber, formatPrice } from "@/lib/utils";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const product = useProduct(params.id);
  const addToCart = useAddToCart();
  const { showToast } = useToast();
  const { trackProductView } = useAnalytics();

  useEffect(() => {
    if (product.data) {
      trackProductView(product.data._id, {
        title: product.data.name,
        price: product.data.discountPrice ?? product.data.price,
        stock: product.data.stock,
      });
    }
  }, [product.data, trackProductView]);

  async function handleAddToCart() {
    if (!product.data) return;

    try {
      await addToCart.mutateAsync({ productId: product.data._id, quantity: 1 });
      showToast({ type: "success", title: "محصول به سبد خرید اضافه شد" });
    } catch (error) {
      showToast({
        type: "error",
        title: "افزودن به سبد خرید ناموفق بود",
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  if (product.isLoading) {
    return (
      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 md:grid-cols-2 md:gap-8">
        <Card className="aspect-square p-6">
          <Skeleton className="h-full w-full rounded-3xl" />
        </Card>
        <Card className="p-6 text-right">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="mt-5 h-10 w-3/4" />
          <Skeleton className="mt-4 h-28 w-full" />
          <Skeleton className="mt-6 h-10 w-40" />
          <Skeleton className="mt-8 h-11 w-full md:w-44" />
        </Card>
      </main>
    );
  }

  if (product.isError || !product.data) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <Card className="border-red-200 bg-red-50 p-8 text-center text-red-700">
          <p className="text-xl font-black">محصول پیدا نشد یا قابل بارگذاری نیست</p>
          <p className="mt-3 text-sm leading-7">
            {product.error instanceof Error ? product.error.message : "دریافت جزئیات محصول با خطا مواجه شد."}
          </p>
          <Link href="/products" className="mt-6 inline-flex">
            <Button type="button">بازگشت به لیست محصولات</Button>
          </Link>
        </Card>
      </main>
    );
  }

  const item = product.data;
  const price = item.discountPrice ?? item.price;
  const discountPercent = item.discountPrice && item.price > 0
    ? Math.max(0, Math.round(((item.price - item.discountPrice) / item.price) * 100))
    : 0;

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 md:grid-cols-2 md:gap-8">
      <Card className="aspect-square p-6">
        <div className="flex h-full items-center justify-center rounded-3xl bg-slate-50 text-8xl">🛍️</div>
      </Card>
      <section className="rounded-3xl bg-white p-6 text-right shadow-sm">
        <div className="flex flex-wrap gap-2">
          <Badge className={item.stock > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}>
            {item.stock > 0 ? `${formatNumber(item.stock)} عدد موجود` : "ناموجود"}
          </Badge>
          {discountPercent > 0 ? <Badge className="bg-rose-50 text-rose-700">{formatNumber(discountPercent)}٪ تخفیف</Badge> : null}
        </div>
        <h1 className="mt-5 text-3xl font-black leading-tight text-slate-950">{item.name}</h1>
        <p className="mt-4 leading-8 text-slate-600">{item.description}</p>
        <div className="mt-6 flex flex-wrap items-end gap-3">
          <p className="text-3xl font-black text-rose-600">{formatPrice(price)}</p>
          {item.discountPrice ? <p className="text-slate-400 line-through">{formatPrice(item.price)}</p> : null}
        </div>
        <p className="mt-5 text-sm leading-7 text-slate-500">با افزودن این محصول به سبد، می‌توانید از صفحه سبد خرید تعداد را تغییر دهید و سپس وارد مسیر پرداخت آزمایشی شوید.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button type="button" disabled={item.stock < 1 || addToCart.isPending} onClick={handleAddToCart} className="w-full sm:w-auto">
            {addToCart.isPending ? "در حال افزودن..." : "افزودن به سبد خرید"}
          </Button>
          <Link href="/cart" className="w-full sm:w-auto">
            <Button type="button" variant="outline" className="w-full">مشاهده سبد خرید</Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
