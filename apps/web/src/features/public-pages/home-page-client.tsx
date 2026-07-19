"use client";

import { motion } from "@/components/ui/csp-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { 
  Truck, ShieldCheck, RotateCcw, Headphones, Zap, ArrowLeft, 
  Clock, Percent, Star 
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
        
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:py-16 lg:py-20">
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

            <div className="mt-8 flex flex-wrap gap-4">
              <LinkButton href="/products" className="rounded-2xl bg-white px-8 py-4 text-lg font-bold text-rose-700 shadow-xl hover:bg-rose-50">
                شروع خرید
                <ArrowLeft className="h-5 w-5" />
              </LinkButton>
              <LinkButton href="#categories" variant="ghost" className="rounded-2xl border border-white/40 bg-white/10 px-6 py-4 text-lg font-semibold text-white backdrop-blur hover:bg-white/20">
                مشاهده دسته‌بندی‌ها
              </LinkButton>
            </div>

            <div className="mt-8 flex items-center gap-6 text-sm text-white/80">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-400" /> ۴.۸ امتیاز
              </div>
              <div>+۱۲۰٬۰۰۰ سفارش موفق</div>
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
              <div key={i} className="rounded-3xl border p-4">
                <Skeleton className="mx-auto h-14 w-14 rounded-2xl" />
                <Skeleton className="mx-auto mt-3 h-4 w-16" />
              </div>
            ))
          ) : (
            visibleCategories.map((cat) => (
              <Link
                key={cat._id}
                href={cat.href}
                className="group flex flex-col items-center rounded-3xl border border-slate-200 bg-white p-4 text-center transition hover:border-rose-200 hover:shadow-md"
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
              <div className={`group relative overflow-hidden rounded-3xl bg-gradient-to-l ${banner.color} p-8 text-white transition active:scale-[0.985]`}>
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
      <section className="mx-auto max-w-7xl px-4 pt-12">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100">
              <Star className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">پرفروش‌ترین‌ها</h2>
              <p className="text-sm text-slate-500">محبوب‌ترین محصولات هفته</p>
            </div>
          </div>
          <Link href="/products" className="text-sm font-semibold text-rose-600 hover:text-rose-700">مشاهده همه</Link>
        </div>

        <motion.div
          initial={shouldAnimate ? { opacity: 0, y: 15 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
        >
          {products.isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-full rounded-3xl border bg-white p-3"><Skeleton className="aspect-square w-full rounded-2xl" /></div>
            ))
          ) : bestSellers.length > 0 ? (
            bestSellers.map((product, index) => (
              <div key={product._id} className="h-full">
                <ProductCard product={product} priority={index < 6} fetchPriority={index < 4 ? "high" : "auto"} />
              </div>
            ))
          ) : null}
        </motion.div>
      </section>

      {/* ==================== FLASH SALE (همیشه نمایش داده می‌شود) ==================== */}
      <section className="mx-auto max-w-7xl px-4 pt-12">
        <div className="mb-6 flex items-center justify-between rounded-3xl bg-gradient-to-l from-red-500 to-orange-500 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <Percent className="h-6 w-6" />
            <div>
              <div className="font-black text-xl">فروش ویژه</div>
              <div className="text-sm text-white/90">تا ۷۰٪ تخفیف — محدود</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4" /> ۱۲ ساعت باقی‌مانده
          </div>
        </div>

        <motion.div
          initial={shouldAnimate ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
        >
          {(discounted.length > 0 ? discounted : uniqueItems.slice(0, 6)).map((product, index) => (
            <div key={product._id} className="h-full">
              <ProductCard product={product} priority={index < 2} />
            </div>
          ))}
        </motion.div>
      </section>

      {/* ==================== NEW ARRIVALS ==================== */}
      <section className="mx-auto max-w-7xl px-4 pt-12 pb-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900">جدیدترین محصولات</h2>
            <p className="text-sm text-slate-500">تازه به فروشگاه اضافه شده‌اند</p>
          </div>
          <Link href="/products" className="text-sm font-semibold text-rose-600 hover:text-rose-700">همه محصولات جدید</Link>
        </div>

        <motion.div
          initial={shouldAnimate ? { opacity: 0, y: 15 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
        >
          {newArrivals.length > 0 ? newArrivals.map((product) => (
            <div key={product._id} className="h-full">
              <ProductCard product={product} priority={false} />
            </div>
          )) : (
            uniqueItems.slice(0, 6).map((product, index) => (
              <div key={product._id} className="h-full">
                <ProductCard product={product} priority={index < 2} />
              </div>
            ))
          )}
        </motion.div>
      </section>

      {/* ==================== FINAL CTA ==================== */}
      <section className="mx-auto max-w-7xl px-4 pb-10">
        <div className="rounded-3xl bg-slate-900 px-8 py-10 text-center text-white">
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
