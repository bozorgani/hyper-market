"use client";

import { useEffect } from "react";
import { LinkButton } from "@/components/ui/link-button";
import { ProductGallery } from "@/components/product-gallery";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useAnalytics } from "@/hooks/use-analytics";
import { useAddToCart } from "@/hooks/use-cart";
import { useAuthStore } from "@/store/auth-store";
import { useRouter } from "next/navigation";
import { useProduct } from "@/hooks/use-products";
import { formatNumber, formatPrice } from "@/lib/utils";
import { ProductReviews } from "@/components/reviews/product-reviews";
import { WishlistButton } from "@/components/wishlist-button";
import type { Product } from "@/types/domain";

export function ProductDetailPageClient({
  productId,
  initialProduct,
  reviewOrderId,
}: {
  productId: string;
  initialProduct?: Product;
  reviewOrderId?: string;
}) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const product = useProduct(productId, initialProduct);
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
          <LinkButton href="/products" className="mt-6">
            بازگشت به لیست محصولات
          </LinkButton>
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
    <div className="pb-36 md:pb-0">
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 md:grid-cols-2 md:gap-8">
      <Card className="p-6">
        <ProductGallery images={item.images} productName={item.name} />
      </Card>
      <section className="rounded-3xl bg-white p-6 text-right shadow-sm">
        <div className="flex flex-wrap gap-2">
          <Badge className={item.stock > 0 ? "bg-rose-50 text-rose-700" : "bg-red-50 text-red-700"}>
            {item.stock > 0 ? `${formatNumber(item.stock)} ${item.unit ?? "عدد"} موجود` : "ناموجود"}
          </Badge>
          {discountPercent > 0 ? <Badge className="bg-rose-50 text-rose-700">{formatNumber(discountPercent)}٪ تخفیف</Badge> : null}
          {item.brand ? <Badge className="bg-violet-50 text-violet-700">{item.brand}</Badge> : null}
          {item.sku ? <Badge className="bg-slate-100 text-slate-500 font-mono">{item.sku}</Badge> : null}
        </div>
        <h1 className="mt-5 text-3xl font-black leading-tight text-slate-950">{item.name}</h1>
        <p className="mt-4 leading-8 text-slate-600">{item.description}</p>

        {/* Attributes */}
        {(item.brand || item.unit || item.weight || (item.tags && item.tags.length > 0)) ? (
          <div className="mt-5 space-y-3 rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">مشخصات</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {item.brand ? (
                <div><span className="text-slate-500">برند:</span> <span className="font-semibold text-slate-800">{item.brand}</span></div>
              ) : null}
              {item.unit ? (
                <div><span className="text-slate-500">واحد:</span> <span className="font-semibold text-slate-800">{item.unit}</span></div>
              ) : null}
              {item.weight ? (
                <div><span className="text-slate-500">وزن:</span> <span className="font-semibold text-slate-800">{formatNumber(item.weight)} گرم</span></div>
              ) : null}
              {item.sku ? (
                <div><span className="text-slate-500">کد انبار:</span> <span className="font-mono font-semibold text-slate-800">{item.sku}</span></div>
              ) : null}
            </div>
            {item.tags && item.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {item.tags.map((tag) => (
                  <span key={tag} className="rounded-lg bg-white px-2 py-0.5 text-xs text-slate-600 ring-1 ring-slate-200">{tag}</span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="mt-6 flex flex-wrap items-end gap-3">
          <p className="text-3xl font-black text-rose-600">{formatPrice(price)}</p>
          {item.discountPrice ? <p className="text-slate-400 line-through">{formatPrice(item.price)}</p> : null}
        </div>
        <p className="mt-5 text-sm leading-7 text-slate-500">با افزودن این محصول به سبد خرید، می‌توانید تعداد کالاها را در سبد بررسی و ویرایش کنید و سپس سفارش خود را ثبت کنید.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button type="button" disabled={item.stock < 1 || addToCart.isPending} onClick={handleAddToCart} className="w-full sm:w-auto">
            {addToCart.isPending ? "در حال افزودن..." : "افزودن به سبد خرید"}
          </Button>
          <WishlistButton
            productId={item._id}
            size="md"
            showLabel
            className="w-full justify-center sm:w-auto"
          />
          <LinkButton href="/cart" variant="outline" className="w-full sm:w-auto">مشاهده سبد خرید</LinkButton>
        </div>
      </section>
    </main>
    {/* Product Reviews Section */}
    <div className="mx-auto max-w-6xl px-4 pb-12">
      <ProductReviews productId={item._id} orderId={reviewOrderId} />
    </div>

    <div className="mobile-purchase-bar fixed inset-x-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-6px_20px_rgba(15,23,42,0.08)] backdrop-blur-xl md:hidden">
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium text-slate-500">قیمت نهایی</p>
          <p className="truncate text-base font-black text-rose-600">{formatPrice(price)} <span className="text-[10px] font-medium text-slate-400">تومان</span></p>
        </div>
        <Button
          type="button"
          disabled={item.stock < 1 || addToCart.isPending}
          onClick={handleAddToCart}
          className="min-h-11 flex-1 rounded-2xl text-xs sm:flex-none sm:px-8"
          aria-label={`افزودن ${item.name} به سبد خرید`}
        >
          {addToCart.isPending ? "در حال افزودن..." : item.stock < 1 ? "ناموجود" : "افزودن به سبد"}
        </Button>
      </div>
    </div>
    </div>
  );
}
