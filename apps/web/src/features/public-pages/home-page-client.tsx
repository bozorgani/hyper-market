"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { 
  Truck, ShieldCheck, RotateCcw, Headphones, Zap, ArrowLeft, 
  Clock, Percent, Star 
} from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useProducts, useCategories } from "@/hooks/use-products";
import { useAuthStore } from "@/store/auth-store";
import type { Category, ProductListResponse } from "@/types/domain";

const features = [
  { icon: <Truck className="h-5 w-5" />, label: "ارسال سریع", desc: "در کمتر از ۲ ساعت", color: "text-emerald-600 bg-emerald-100" },
  { icon: <ShieldCheck className="h-5 w-5" />, label: "تضمین اصالت", desc: "۱۰۰٪ اورجینال", color: "text-blue-600 bg-blue-100" },
  { icon: <RotateCcw className="h-5 w-5" />, label: "بازگشت آسان", desc: "۷ روز ضمانت", color: "text-violet-600 bg-violet-100" },
  { icon: <Headphones className="h-5 w-5" />, label: "پشتیبانی ۲۴/۷", desc: "همیشه در دسترس", color: "text-amber-600 bg-amber-100" },
];


const fallbackCategories = [
  { _id: "fallback-dairy", name: "لبنیات", icon: "🥛", href: "/products?search=لبنیات" },
  { _id: "fallback-protein", name: "پروتئین", icon: "🥩", href: "/products?search=گوشت" },
  { _id: "fallback-drinks", name: "نوشیدنی", icon: "🥤", href: "/products?search=نوشیدنی" },
  { _id: "fallback-snacks", name: "تنقلات", icon: "🍿", href: "/products?search=تنقلات" },
  { _id: "fallback-fruits", name: "میوه", icon: "🍎", href: "/products?search=میوه" },
  { _id: "fallback-bakery", name: "نان", icon: "🥖", href: "/products?search=نان" },
  { _id: "fallback-cleaning", name: "شوینده", icon: "🧼", href: "/products?search=شوینده" },
  { _id: "fallback-canned", name: "کنسرو", icon: "🥫", href: "/products?search=کنسرو" },
];

const promoBanners = [
  {
    title: "تخفیف تا ۵۰٪",
    subtitle: "محصولات لبنی و پروتئینی",
    color: "from-emerald-600 to-emerald-700",
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

  const items = products.data?.items ?? [];
  const categoryList = categories.data ?? [];
  const shouldShowCategorySkeleton = categories.isLoading && categoryList.length === 0;
  const visibleCategories = categoryList.length > 0
    ? categoryList.slice(0, 12).map((cat) => ({ ...cat, href: `/products?category=${cat._id}` }))
    : fallbackCategories;

  // همیشه داده داشته باشیم
  const bestSellers = items.length > 0 ? items.slice(0, 8) : [];
  const newArrivals = items.length > 0 ? [...items].reverse().slice(0, 6) : [];
  const discounted = items.length > 0 
    ? items.filter((p) => p.discountPrice != null).slice(0, 6) 
    : items.slice(0, 4); // fallback

  return (
    <main className="pb-20 lg:pb-10 bg-slate-50">
      {/* ==================== HERO ==================== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-blue-700 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] bg-[length:4px_4px]" />
        
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:py-16 lg:py-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1 text-sm font-medium backdrop-blur">
              <Zap className="h-4 w-4" />
              پیشنهاد ویژه امروز
            </div>

            <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              خرید سریع و<br />ارزان از اسنپ‌مارکت
            </h1>
            
            <p className="mt-4 max-w-md text-lg text-white/90">
              هزاران محصول تازه با ارسال در کمتر از ۲ ساعت
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/products">
                <button className="flex items-center justify-center gap-2 rounded-2xl bg-white px-8 py-4 text-lg font-bold text-emerald-700 shadow-xl transition hover:bg-emerald-50 active:scale-[0.985]">
                  شروع خرید
                  <ArrowLeft className="h-5 w-5" />
                </button>
              </Link>
              <Link href="#categories">
                <button className="flex items-center justify-center gap-2 rounded-2xl border border-white/40 bg-white/10 px-6 py-4 text-lg font-semibold backdrop-blur transition hover:bg-white/20">
                  مشاهده دسته‌بندی‌ها
                </button>
              </Link>
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
          <Link href="/products" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700">
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
                className="group flex flex-col items-center rounded-3xl border border-slate-200 bg-white p-4 text-center transition hover:border-emerald-200 hover:shadow-md"
              >
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-3xl transition group-hover:scale-110">
                  {cat.icon || "🛒"}
                </div>
                <span className="text-sm font-semibold text-slate-700 group-hover:text-emerald-700">
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
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100">
              <Star className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">پرفروش‌ترین‌ها</h2>
              <p className="text-sm text-slate-500">محبوب‌ترین محصولات هفته</p>
            </div>
          </div>
          <Link href="/products" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700">مشاهده همه</Link>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {products.isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-3xl border bg-white p-3"><Skeleton className="aspect-square w-full rounded-2xl" /></div>
            ))
          ) : bestSellers.length > 0 ? (
            bestSellers.map((product) => (
              <motion.div key={product._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}>
                <ProductCard product={product} />
              </motion.div>
            ))
          ) : null}
        </div>
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

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {(discounted.length > 0 ? discounted : items.slice(0, 6)).map((product) => (
            <motion.div key={product._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.04 }}>
              <ProductCard product={product} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* ==================== NEW ARRIVALS ==================== */}
      <section className="mx-auto max-w-7xl px-4 pt-12 pb-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900">جدیدترین محصولات</h2>
            <p className="text-sm text-slate-500">تازه به فروشگاه اضافه شده‌اند</p>
          </div>
          <Link href="/products" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700">همه محصولات جدید</Link>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {newArrivals.length > 0 ? newArrivals.map((product) => (
            <motion.div key={product._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}>
              <ProductCard product={product} />
            </motion.div>
          )) : (
            items.slice(0, 6).map((product) => (
              <ProductCard key={product._id} product={product} />
            ))
          )}
        </div>
      </section>

      {/* ==================== FINAL CTA ==================== */}
      <section className="mx-auto max-w-7xl px-4 pb-10">
        <div className="rounded-3xl bg-slate-900 px-8 py-10 text-center text-white">
          <div className="mx-auto max-w-md">
            <h3 className="text-3xl font-black">هر روز، تازه‌تر</h3>
            <p className="mt-3 text-slate-300">
              {user ? "سفارش‌های خود را دنبال کنید" : "همین حالا ثبت‌نام کنید و از تخفیف‌های اختصاصی بهره‌مند شوید"}
            </p>
            <Link href={user ? "/orders" : "/register"}>
              <button className="mt-6 rounded-2xl bg-emerald-500 px-8 py-3.5 font-bold text-white shadow-lg transition hover:bg-emerald-600">
                {user ? "مشاهده سفارش‌ها" : "ثبت‌نام رایگان"}
              </button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
