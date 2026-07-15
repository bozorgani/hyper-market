"use client";

import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminAnalyticsDashboard } from "@/features/admin/admin-api";
import { formatNumber, formatPrice } from "@/lib/utils";
import { motion } from "@/components/ui/csp-motion";
import { DollarSign, Users, TrendingUp, Activity, Search, Eye, ShoppingCart } from "lucide-react";

type AnalyticsDashboard = {
  activeUsers?: number;
  revenue?: {
    dailyRevenue?: number;
    weeklyRevenue?: number;
    monthlyRevenue?: number;
    revenueByDay?: Array<{ _id: string; revenue: number }>;
  };
  products?: {
    mostViewed?: Array<{ productId: string; count: number }>;
    mostAddedToCart?: Array<{ productId: string; count: number }>;
    conversionRatePerProduct?: Array<{ productId: string; views: number; addToCart: number; conversionRate: number }>;
  };
  search?: {
    topSearchQueries?: Array<{ query: string; count: number; noResultCount: number }>;
    noResultSearches?: Array<{ query: string; count: number; noResultCount: number }>;
    trendingSearches?: Array<{ query: string; count: number; noResultCount: number }>;
  };
  funnel?: {
    productViews?: number;
    addToCart?: number;
    checkoutStarts?: number;
    paymentSuccess?: number;
    steps?: Array<{ name: string; count: number }>;
  };
};

const funnelLabels: Record<string, string> = {
  "View Product": "مشاهده محصول",
  "Add to Cart": "افزودن به سبد",
  Checkout: "شروع تسویه",
  "Payment Success": "پرداخت موفق",
};

const funnelColors = ["bg-emerald-500", "bg-blue-500", "bg-violet-500", "bg-amber-500"];

function MiniBarChart({ items }: { items: Array<{ label: string; value: number }> }) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);
  return (
    <div className="flex h-48 items-end gap-2">
      {items.map((item, idx) => (
        <motion.div
          key={item.label}
          initial={{ height: 0 }}
          animate={{ height: `${(item.value / maxValue) * 100}%` }}
          transition={{ delay: 0.3 + idx * 0.05, duration: 0.5, ease: "easeOut" }}
          className="group relative flex flex-1 flex-col items-center"
        >
          <div className="mb-2 text-[10px] font-semibold text-slate-500 opacity-0 transition group-hover:opacity-100">
            {formatNumber(item.value)}
          </div>
          <div className="min-h-[6px] w-full flex-1 rounded-t-xl bg-gradient-to-t from-emerald-600 to-emerald-400" />
          <span className="mt-2 text-[10px] text-slate-400 truncate max-w-full">{item.label}</span>
        </motion.div>
      ))}
    </div>
  );
}

function FunnelChart({ items }: { items: Array<{ name: string; count: number }> }) {
  const maxCount = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        const widthPercent = (item.count / maxCount) * 100;
        return (
          <div key={item.name}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-700">{funnelLabels[item.name] ?? item.name}</span>
              <span className="font-bold text-slate-900">{formatNumber(item.count)}</span>
            </div>
            <div className="relative h-8 overflow-hidden rounded-xl bg-slate-100">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(widthPercent, 5)}%` }}
                transition={{ delay: 0.4 + idx * 0.1, duration: 0.6, ease: "easeOut" }}
                className={`absolute inset-y-0 right-0 rounded-xl ${funnelColors[idx] ?? "bg-emerald-500"}`}
              />
            </div>
            {idx < items.length - 1 && items[idx + 1] && (
              <p className="mt-1 text-xs text-slate-400">
                {item.count > 0 ? `${((items[idx + 1].count / item.count) * 100).toFixed(1)}%` : "-"} تبدیل
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProgressList({ items, valueFormatter }: { items: Array<{ key: string; label: string; value: number; subtitle?: string }>; valueFormatter?: (value: number) => string }) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.key}>
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-semibold text-slate-800">{item.label}</span>
            <span className="shrink-0 font-bold text-slate-700">{valueFormatter ? valueFormatter(item.value) : formatNumber(item.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / maxValue) * 100}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-l from-emerald-500 to-emerald-400"
            />
          </div>
          {item.subtitle && <p className="mt-1 text-xs text-slate-400">{item.subtitle}</p>}
        </div>
      ))}
    </div>
  );
}

export function AdminAnalyticsClient() {
  const dashboard = useAdminAnalyticsDashboard();
  const data = dashboard.data as AnalyticsDashboard | undefined;
  const errorMessage = dashboard.error instanceof Error ? dashboard.error.message : "دریافت داده‌های آنالیتیکس ناموفق بود.";

  const revenueBars = (data?.revenue?.revenueByDay ?? []).slice(-7).map((item) => ({ label: item._id, value: item.revenue }));
  const funnelItems = (data?.funnel?.steps ?? []).map((step) => ({ name: step.name, count: step.count }));
  const topSearchItems = (data?.search?.topSearchQueries ?? []).slice(0, 8).map((item) => ({
    key: item.query, label: item.query, value: item.count,
    subtitle: item.noResultCount ? `${formatNumber(item.noResultCount)} بدون نتیجه` : "دارای نتیجه",
  }));
  const mostViewedItems = (data?.products?.mostViewed ?? []).slice(0, 8).map((item) => ({
    key: item.productId, label: item.productId, value: item.count,
  }));
  const conversionItems = (data?.products?.conversionRatePerProduct ?? []).slice(0, 8).map((item) => ({
    key: item.productId, label: item.productId, value: item.conversionRate,
    subtitle: `${formatNumber(item.views)} بازدید · ${formatNumber(item.addToCart)} سبد`,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-slate-900">آنالیتیکس فروشگاه</h1>
        <p className="mt-1 text-sm text-slate-500">تحلیل رفتار کاربران، درآمد، جستجو و قیف خرید</p>
      </div>

      {dashboard.isLoading ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-36 w-full rounded-2xl" />)}
        </section>
      ) : null}

      {dashboard.isError ? <ErrorState title="بارگذاری آنالیتیکس انجام نشد" description={errorMessage} /> : null}

      {!dashboard.isLoading && !dashboard.isError ? (
        <>
          {/* Stat Cards */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AdminStatCard title="درآمد امروز" value={formatPrice(data?.revenue?.dailyRevenue ?? 0)} icon={DollarSign} gradient="bg-emerald-500" delay={0} />
            <AdminStatCard title="درآمد هفتگی" value={formatPrice(data?.revenue?.weeklyRevenue ?? 0)} icon={TrendingUp} gradient="bg-blue-500" delay={0.08} />
            <AdminStatCard title="درآمد ماهانه" value={formatPrice(data?.revenue?.monthlyRevenue ?? 0)} icon={Activity} gradient="bg-amber-500" delay={0.16} />
            <AdminStatCard title="کاربران فعال" value={data?.activeUsers ?? 0} icon={Users} gradient="bg-violet-500" delay={0.24} />
          </section>

          {/* Revenue Chart + Funnel */}
          <section className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">روند درآمد روزانه</h2>
                  <p className="text-xs text-slate-400">آخرین روزهای ثبت‌شده</p>
                </div>
              </div>
              <div className="mt-6">
                {revenueBars.length > 0 ? <MiniBarChart items={revenueBars} /> : <EmptyState title="داده درآمد موجود نیست" description="برای نمایش نمودار، رویدادهای بیشتری لازم است." />}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50">
                  <ShoppingCart className="h-4 w-4 text-violet-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">قیف خرید</h2>
                  <p className="text-xs text-slate-400">از مشاهده تا پرداخت</p>
                </div>
              </div>
              <div className="mt-6">
                {funnelItems.length > 0 ? <FunnelChart items={funnelItems} /> : <EmptyState title="قیف خرید خالی است" description="هنوز داده کافی ثبت نشده." />}
              </div>
            </motion.div>
          </section>

          {/* Search + Most Viewed */}
          <section className="grid gap-4 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
                  <Search className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">جستجوهای برتر</h2>
                  <p className="text-xs text-slate-400">بیشترین جستجو در فروشگاه</p>
                </div>
              </div>
              <div className="mt-6">
                {topSearchItems.length > 0 ? <ProgressList items={topSearchItems} /> : <EmptyState title="جستجویی ثبت نشده" description="هنوز داده‌ای در دسترس نیست." />}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
                  <Eye className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">پربازدیدترین محصولات</h2>
                  <p className="text-xs text-slate-400">بیشترین بازدید در بازه فعلی</p>
                </div>
              </div>
              <div className="mt-6">
                {mostViewedItems.length > 0 ? <ProgressList items={mostViewedItems} /> : <EmptyState title="بازدیدی ثبت نشده" description="پس از ثبت رویدادهای view تکمیل می‌شود." />}
              </div>
            </motion.div>
          </section>

          {/* Conversion Rates */}
          {conversionItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">نرخ تبدیل محصولات</h2>
                  <p className="text-xs text-slate-400">مقایسه بازدید تا افزودن به سبد</p>
                </div>
              </div>
              <div className="mt-6">
                <ProgressList items={conversionItems} valueFormatter={(value) => `${formatNumber(value)}%`} />
              </div>
            </motion.div>
          )}
        </>
      ) : null}
    </div>
  );
}