"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ChevronLeft, Truck, ShieldCheck, RotateCcw, Headphones, Zap, Percent } from "lucide-react";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useProducts, useCategories } from "@/hooks/use-products";
import { useAuthStore } from "@/store/auth-store";

const categoryIcons: Record<string, string> = {
  default: "🛒",
};

const features = [
  { icon: <Truck className="h-5 w-5" />, label: "ارسال سریع", color: "text-emerald-600 bg-emerald-50" },
  { icon: <ShieldCheck className="h-5 w-5" />, label: "تضمین اصالت", color: "text-blue-600 bg-blue-50" },
  { icon: <RotateCcw className="h-5 w-5" />, label: "بازگشت آسان", color: "text-violet-600 bg-violet-50" },
  { icon: <Headphones className="h-5 w-5" />, label: "پشتیبانی ۲۴/۷", color: "text-amber-600 bg-amber-50" },
];

export default function HomePage() {
  const products = useProducts(1);
  const categories = useCategories();
  const user = useAuthStore((s) => s.user);
  const items = products.data?.items ?? [];
  const categoryList = categories.data ?? [];

  return (
    <main className="pb-20 lg:pb-8">
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-bl from-emerald-600 via-emerald-500 to-teal-500">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />
        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute right-10 top-10 h-40 w-40 rounded-full bg-teal-400/20 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:py-12">
          <div className="max-w-lg">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold text-white/90 backdrop-blur">
                <Zap className="h-3.5 w-3.5" />
                پیشنهاد ویژه امروز
              </div>
              <h1 className="mt-4 text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
                تازه‌ترین محصولات
                <br />
                <span className="text-emerald-100">با بهترین قیمت</span>
              </h1>
              <p className="mt-4 max-w-md text-sm leading-7 text-white/80 sm:text-base">
                هزاران محصول با تضمین اصالت، ارسال سریع و تخفیف‌های باورنکردنی. همین حالا سفارش بدید!
              </p>
              <div className="mt-6 flex gap-3">
                <Link href="/products">
                  <button className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-emerald-700 shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-50">
                    مشاهده همه محصولات
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Bar */}
      <section className="border-b border-slate-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex gap-4 overflow-x-auto scrollbar-hide">
            {features.map((feat) => (
              <div key={feat.label} className="flex shrink-0 items-center gap-2.5 rounded-2xl px-4 py-2.5 transition hover:bg-slate-50">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${feat.color}`}>
                  {feat.icon}
                </div>
                <span className="text-xs font-bold text-slate-700 whitespace-nowrap">{feat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4">
        {/* Categories */}
        {!categories.isLoading && categoryList.length > 0 && (
          <section className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-slate-900">دسته‌بندی‌ها</h2>
              <Link href="/products" className="flex items-center gap-1 text-xs font-bold text-emerald-600 transition hover:text-emerald-700">
                مشاهده همه
                <ChevronLeft className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {categoryList.slice(0, 10).map((cat, idx) => (
                <motion.div
                  key={cat._id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                >
                  <Link
                    href={`/products?category=${cat._id}`}
                    className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-white px-5 py-4 transition hover:border-emerald-200 hover:shadow-md min-w-[80px]"
                  >
                    <span className="text-2xl">{categoryIcons[cat.slug] ?? "📦"}</span>
                    <span className="text-[11px] font-semibold text-slate-700 whitespace-nowrap text-center">{cat.name}</span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Products Grid */}
        <section className="mt-8">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                <Percent className="h-4 w-4 text-emerald-600" />
              </div>
              <h2 className="text-lg font-black text-slate-900">محصولات پرفروش</h2>
            </div>
            <Link href="/products" className="flex items-center gap-1 text-xs font-bold text-emerald-600 transition hover:text-emerald-700">
              همه محصولات
              <ChevronLeft className="h-3.5 w-3.5" />
            </Link>
          </div>

          {products.isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
                  <Skeleton className="aspect-square w-full rounded-none" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-5 w-1/2 mt-3" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {!products.isLoading && items.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {items.slice(0, 10).map((product, idx) => (
                <motion.div
                  key={product._id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.04, 0.3) }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          )}

          {!products.isLoading && items.length === 0 && !products.isError && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-5xl mb-4">🛒</div>
              <p className="font-bold text-slate-700">محصولی هنوز ثبت نشده</p>
              <p className="mt-1 text-sm text-slate-400">از پنل مدیریت محصولات اضافه کنید</p>
              <Link href="/products" className="mt-4 rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-600">
                صفحه محصولات
              </Link>
            </div>
          )}
        </section>

        {/* CTA Banner */}
        <section className="mt-8 rounded-2xl bg-gradient-to-l from-slate-900 to-slate-800 p-6 sm:p-8">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-right">
            <div className="flex-1">
              <h3 className="text-lg font-black text-white">
                {user ? "سفارش‌های شما در انتظار است" : "از تخفیف‌های ویژه باخبر شوید"}
              </h3>
              <p className="mt-1.5 text-sm text-slate-400">
                {user
                  ? "وضعیت سفارش‌های اخیر و تخفیف‌های اختصاصی خود را ببینید."
                  : "ایمیل یا شماره موبایل خود را ثبت کنید تا از جدیدترین تخفیف‌ها و محصولات باخبر شوید."}
              </p>
            </div>
            <Link href={user ? "/orders" : "/register"}>
              <button className="shrink-0 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-600">
                {user ? "مشاهده سفارش‌ها" : "ثبت‌نام کنید"}
              </button>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}