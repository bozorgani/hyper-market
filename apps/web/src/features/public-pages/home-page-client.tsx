"use client";

import { motion } from "@/components/ui/csp-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Truck, ShieldCheck, RotateCcw, Headphones, Zap, ArrowLeft,
  Clock, Percent, ShoppingCart, Star,
} from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { LinkButton } from "@/components/ui/link-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProducts, useCategories } from "@/hooks/use-products";
import { useAuthStore } from "@/store/auth-store";
import { fallbackCategories, getCategoryProductsHref } from "@/lib/category-utils";
import type { Category, ProductListResponse } from "@/types/domain";

const features = [
  { icon: <Truck className="h-5 w-5" />, label: "ارسال سریع", desc: "در کمتر از ۲ ساعت", color: "text-rose-600 bg-rose-100" },
  { icon: <ShieldCheck className="h-5 w-5" />, label: "تضمین اصالت", desc: "۱۰۰٪ اورجینال", color: "text-blue-600 bg-blue-100" },
  { icon: <RotateCcw className="h-5 w-5" />, label: "بازگشت آسان", desc: "۷ روز ضمانت", color: "text-violet-600 bg-violet-100" },
  { icon: <Headphones className="h-5 w-5" />, label: "پشتیبانی ۲۴/۷", desc: "همیشه در دسترس", color: "text-amber-600 bg-amber-100" },
];


const promoBanners = [
  {
    title: "تخفیف تا ۵۰٪",
    subtitle: "محصولات لبنی و پروتئینی",
    color: "from-rose-600 to-rose-700",
    href: "/products?discount=true",
  },
  {
    title: "ارسال رایگان",
    subtitle: "سفارش بالای ۳۰۰ هزار تومان",
    color: "from-blue-600 to-blue-700",
    href: "/products",
  },
];

export function HomePageClient({
  initialProducts,
  initialCategories,
}: {
  initialProducts?: ProductListResponse;
  initialCategories?: Category[];
}) {
  const products = useProducts(1, undefined, undefined, initialProducts);
  const categories = useCategories(initialCategories);
  const user = useAuthStore((s) => s.user);

  const [shouldAnimate, setShouldAnimate] = useState(true);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = () => {
      setShouldAnimate(!mediaQuery.matches);
    };
    const timeout = setTimeout(handler, 0);
    mediaQuery.addEventListener("change", handler);
    return () => {
      clearTimeout(timeout);
      mediaQuery.removeEventListener("change", handler);
    };
  }, []);

  // Deduplicate products by _id to prevent duplicates across sections
  const uniqueItems = useMemo(() => {
    const seen = new Set<string>();
    const source = products.data?.items ?? [];
    return source.filter((item) => {
      if (seen.has(item._id)) return false;
      seen.add(item._id);
      return true;
    });
  }, [products.data?.items]);
  const categoryList = categories.data ?? [];
  const shouldShowCategorySkeleton = categories.isLoading && categoryList.length === 0;
  const visibleCategories = categoryList.length > 0
    ? categoryList.slice(0, 12).map((cat) => ({ ...cat, href: getCategoryProductsHref(cat) }))
    : fallbackCategories;

  // همیشه داده داشته باشیم
  const bestSellers = uniqueItems.length > 0 ? uniqueItems.slice(0, 8) : [];
  const newArrivals = uniqueItems.length > 0 ? [...uniqueItems].reverse().slice(0, 6) : [];
  const discounted = uniqueItems.length > 0 
    ? uniqueItems.filter((p) => p.discountPrice != null).slice(0, 6) 
    : uniqueItems.slice(0, 4); // fallback

  return (
    <main className="pb-0 lg:pb-10 bg-slate-50">
      {/* ==================== HERO ==================== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-rose-600 via-rose-700 to-blue-700 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] bg-[length:4px_4px]" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-10 sm:py-14 lg:grid-cols-[1.05fr,0.95fr] lg:gap-16 lg:py-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1 text-sm font-medium backdrop-blur">
              <Zap className="h-4 w-4" />
              پیشنهاد ویژه امروز
            </div>

            <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              خرید سریع و<br />ارزان از هایپرمارکت
            </h1>

            <p className="mt-4 max-w-md text-lg text-white/90">
              هزاران محصول تازه با ارسال در کمتر از ۲ ساعت
            </p>

            <div className="mt-8 flex flex-wrap gap-3 sm:gap-4">
              <LinkButton href="/products" className="rounded-2xl bg-white px-7 py-3.5 text-base font-bold text-rose-700 shadow-xl hover:bg-rose-50 sm:px-8 sm:py-4 sm:text-lg">
                شروع خرید
                <ArrowLeft className="h-5 w-5" />
              </LinkButton>
              <LinkButton href="#categories" variant="ghost" className="rounded-2xl border border-white/40 bg-white/10 px-5 py-3.5 text-sm font-semibold text-white backdrop-blur hover:bg-white/20 sm:px-6 sm:py-4 sm:text-base">
                مشاهده دسته‌بندی‌ها
              </LinkButton>
            </div>

            <div className="mt-7 flex items-center gap-5 text-xs text-white/80 sm:mt-8 sm:gap-6 sm:text-sm">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-400" /> ۴.۸ امتیاز
              </div>
              <div>+۱۲۰٬۰۰۰ سفارش موفق</div>
            </div>
          </div>

          <div className="relative mx-auto h-64 w-full max-w-md sm:h-80 lg:h-[22rem]" aria-label="نمایی از تجربه خرید سریع" role="img">
            <div className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-sm sm:h-64 sm:w-64" />
            <div className="absolute right-3 top-2 flex h-20 w-20 rotate-6 items-center justify-center rounded-[1.75rem] bg-white/15 text-white shadow-xl backdrop-blur sm:right-8 sm:top-4 sm:h-24 sm:w-24">
              <ShoppingCart className="h-9 w-9 sm:h-11 sm:w-11" aria-hidden="true" />
            </div>
            <div className="absolute bottom-2 left-2 flex h-20 w-20 -rotate-6 items-center justify-center rounded-[1.75rem] bg-orange-400/90 text-white shadow-xl sm:bottom-5 sm:left-8 sm:h-24 sm:w-24">
              <Percent className="h-9 w-9 sm:h-11 sm:w-11" aria-hidden="true" />
            </div>
            <div className="absolute left-1/2 top-1/2 w-[min(88%,20rem)] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-white/30 bg-white p-5 text-slate-900 shadow-2xl sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-rose-600">هایپرمارکت</p>
                  <p className="mt-1 text-lg font-black sm:text-xl">خرید روزانه، ساده‌تر</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 sm:h-12 sm:w-12">
                  <Truck className="h-6 w-6" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                <div className="h-16 rounded-2xl bg-rose-50" />
                <div className="h-16 rounded-2xl bg-blue-50" />
                <div className="h-16 rounded-2xl bg-amber-50" />
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                <Clock className="h-4 w-4 text-rose-600" aria-hidden="true" />
                ارسال سریع و مطمئن
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FEATURES ==================== */}
      <section className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-4 bg-white px-5 py-5">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${feature.color}`}>
                  {feature.icon}
                </div>
                <div>
                  <div className="font-bold text-slate-900">{feature.label}</div>
                  <div className="text-xs text-slate-500">{feature.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== CATEGORIES ==================== */}
      <section id="categories" className="mx-auto max-w-7xl px-4 pt-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900">دسته‌بندی‌ها</h2>
            <p className="text-sm text-slate-500">آنچه نیاز دارید را سریع پیدا کنید</p>
          </div>
          <Link href="/categories" className="text-sm font-semibold text-rose-600 hover:text-rose-700">
            همه دسته‌ها →
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {shouldShowCategorySkeleton ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl border p-4">
                <Skeleton className="mx-auto h-14 w-14 rounded-2xl" />
                <Skeleton className="mx-auto mt-3 h-4 w-16" />
              </div>
            ))
          ) : (
            visibleCategories.map((cat) => (
              <Link
                key={cat._id}
                href={cat.href}
                className="group flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-4 text-center transition hover:border-rose-200 hover:shadow-md"
              >
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-3xl transition group-hover:scale-110">
                  {cat.icon || "🛒"}
                </div>
                <span className="text-sm font-semibold text-slate-700 group-hover:text-rose-700">
                  {cat.name}
                </span>
              </Link>
            ))
          )}
        </div>
        {categories.isError ? (
          <p className="mt-3 text-xs text-amber-600">دسته‌بندی‌ها موقتاً از داده‌های پیشنهادی نمایش داده شده‌اند.</p>
        ) : null}
      </section>

      {/* ==================== PROMO BANNERS ==================== */}
      <section className="mx-auto max-w-7xl px-4 pt-10">
        <div className="grid gap-4 md:grid-cols-2">
          {promoBanners.map((banner, index) => (
            <Link key={index} href={banner.href}>
              <div className={`group relative overflow-hidden rounded-2xl bg-gradient-to-l ${banner.color} p-8 text-white transition active:scale-[0.985]`}>
                <div className="relative z-10">
                  <div className="text-3xl font-black">{banner.title}</div>
                  <div className="mt-1 text-lg text-white/90">{banner.subtitle}</div>
                </div>
                <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-white/10" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ==================== BEST SELLERS ==================== */}
      <section className="mx-auto max-w-7xl rounded-[2rem] bg-white/70 px-4 pt-6 pb-5 sm:px-6 sm:pt-8 sm:pb-7">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100">
              <Star className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <div className="mb-1 inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-700">محبوب این هفته</div>
              <h2 className="text-xl font-black text-slate-900 sm:text-2xl">پرفروش‌ترین‌ها</h2>
              <p className="text-xs text-slate-500 sm:text-sm">محبوب‌ترین محصولات هفته</p>
            </div>
          </div>
          <Link href="/products" className="shrink-0 text-xs font-semibold text-rose-600 hover:text-rose-700 sm:text-sm">مشاهده همه</Link>
        </div>

        <motion.div
          initial={shouldAnimate ? { opacity: 0, y: 15 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="-mx-4 flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
        >
          {products.isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-full min-w-[72vw] snap-start rounded-2xl border bg-white p-3 sm:min-w-0"><Skeleton className="aspect-square w-full rounded-2xl" /></div>
            ))
          ) : bestSellers.length > 0 ? (
            bestSellers.map((product, index) => (
              <div key={product._id} className="h-full min-w-[72vw] snap-start sm:min-w-0">
                <ProductCard product={product} priority={index < 6} fetchPriority={index < 4 ? "high" : "auto"} />
              </div>
            ))
          ) : null}
        </motion.div>
      </section>

      {/* ==================== FLASH SALE (همیشه نمایش داده می‌شود) ==================== */}
      <section className="mx-auto max-w-7xl rounded-[2rem] bg-gradient-to-b from-orange-50 to-rose-50/40 px-4 pt-6 pb-5 sm:px-6 sm:pt-8 sm:pb-7">
        <div className="mb-6 flex items-center justify-between rounded-2xl bg-gradient-to-l from-red-500 to-orange-500 px-4 py-4 text-white shadow-lg shadow-orange-200/50 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15">
              <Percent className="h-5 w-5" />
            </div>
            <div>
              <div className="mb-0.5 text-[10px] font-bold text-white/80">فقط برای مدت محدود</div>
              <div className="font-black text-lg sm:text-xl">فروش ویژه</div>
              <div className="text-xs text-white/90 sm:text-sm">تا ۷۰٪ تخفیف — محدود</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-black/10 px-2.5 py-2 text-[10px] font-bold sm:gap-2 sm:px-3 sm:text-sm">
            <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> ۱۲ ساعت باقی‌مانده
          </div>
        </div>

        <motion.div
          initial={shouldAnimate ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="-mx-4 flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
        >
          {(discounted.length > 0 ? discounted : uniqueItems.slice(0, 6)).map((product, index) => (
            <div key={product._id} className="h-full min-w-[72vw] snap-start sm:min-w-0">
              <ProductCard product={product} priority={index < 2} />
            </div>
          ))}
        </motion.div>
      </section>

      {/* ==================== NEW ARRIVALS ==================== */}
      <section className="mx-auto max-w-7xl rounded-[2rem] border border-blue-100/80 bg-blue-50/40 px-4 pt-6 pb-5 sm:px-6 sm:pt-8 sm:pb-7">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="mb-1 inline-flex rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-blue-700 shadow-sm">تازه رسیده</div>
            <h2 className="text-xl font-black text-slate-900 sm:text-2xl">جدیدترین محصولات</h2>
            <p className="text-xs text-slate-500 sm:text-sm">تازه به فروشگاه اضافه شده‌اند</p>
          </div>
          <Link href="/products" className="shrink-0 text-xs font-semibold text-blue-700 hover:text-blue-800 sm:text-sm">همه محصولات جدید</Link>
        </div>

        <motion.div
          initial={shouldAnimate ? { opacity: 0, y: 15 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="-mx-4 flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
        >
          {newArrivals.length > 0 ? newArrivals.map((product) => (
            <div key={product._id} className="h-full min-w-[72vw] snap-start sm:min-w-0">
              <ProductCard product={product} priority={false} />
            </div>
          )) : (
            uniqueItems.slice(0, 6).map((product, index) => (
              <div key={product._id} className="h-full min-w-[72vw] snap-start sm:min-w-0">
                <ProductCard product={product} priority={index < 2} />
              </div>
            ))
          )}
        </motion.div>
      </section>

      {/* ==================== FINAL CTA ==================== */}
      <section className="mx-auto max-w-7xl px-4 pb-10">
        <div className="rounded-2xl bg-slate-900 px-8 py-10 text-center text-white">
          <div className="mx-auto max-w-md">
            <h3 className="text-3xl font-black">هر روز، تازه‌تر</h3>
            <p className="mt-3 text-slate-300">
              {user ? "سفارش‌های خود را دنبال کنید" : "همین حالا ثبت‌نام کنید و از تخفیف‌های اختصاصی بهره‌مند شوید"}
            </p>
            <LinkButton href={user ? "/orders" : "/register"} className="mt-6 rounded-2xl bg-rose-500 px-8 py-3.5 font-bold text-white shadow-lg hover:bg-rose-600">
              {user ? "مشاهده سفارش‌ها" : "ثبت‌نام رایگان"}
            </LinkButton>
          </div>
        </div>
      </section>
    </main>
  );
}
