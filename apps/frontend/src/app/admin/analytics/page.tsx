"use client";

import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { Card } from "@/components/ui/card";
import { formatNumber, formatPrice } from "@/lib/utils";
import { useAdminAnalyticsDashboard } from "@/features/admin/admin-api";

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

export default function AdminAnalyticsPage() {
  const dashboard = useAdminAnalyticsDashboard();
  const data = dashboard.data as AnalyticsDashboard | undefined;
  const maxFunnel = Math.max(...(data?.funnel?.steps ?? []).map((step) => step.count), 1);

  return (
    <main className="space-y-5 text-right">
      <div>
        <h1 className="text-2xl font-black">آنالیتیکس فروشگاه</h1>
        <p className="mt-2 text-sm text-slate-500">تحلیل رفتار کاربران، فروش، جستجو و قیف خرید</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard title="درآمد امروز" value={formatPrice(data?.revenue?.dailyRevenue ?? 0)} />
        <AdminStatCard title="درآمد هفتگی" value={formatPrice(data?.revenue?.weeklyRevenue ?? 0)} />
        <AdminStatCard title="درآمد ماهانه" value={formatPrice(data?.revenue?.monthlyRevenue ?? 0)} />
        <AdminStatCard title="کاربران فعال" value={data?.activeUsers ?? 0} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-black">قیف خرید</h2>
          <div className="mt-5 space-y-4">
            {(data?.funnel?.steps ?? []).map((step) => (
              <div key={step.name}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-semibold">{funnelLabels[step.name] ?? step.name}</span>
                  <span>{formatNumber(step.count)}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-rose-500" style={{ width: `${(step.count / maxFunnel) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-black">جستجوهای برتر</h2>
          <div className="mt-5 space-y-3">
            {(data?.search?.topSearchQueries ?? []).slice(0, 8).map((item) => (
              <div key={item.query} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 text-sm">
                <span className="font-semibold">{item.query}</span>
                <span className="text-slate-500">{formatNumber(item.count)} بار</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-black">پربازدیدترین محصولات</h2>
          <div className="mt-5 space-y-3">
            {(data?.products?.mostViewed ?? []).slice(0, 8).map((item) => (
              <div key={item.productId} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 text-sm">
                <span className="ltr text-left font-mono text-xs">{item.productId}</span>
                <span>{formatNumber(item.count)} بازدید</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-black">نرخ تبدیل محصولات</h2>
          <div className="mt-5 space-y-3">
            {(data?.products?.conversionRatePerProduct ?? []).slice(0, 8).map((item) => (
              <div key={item.productId} className="rounded-2xl bg-slate-50 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="ltr text-left font-mono text-xs">{item.productId}</span>
                  <span className="font-bold">{formatNumber(item.conversionRate)}٪</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{formatNumber(item.views)} بازدید · {formatNumber(item.addToCart)} افزودن به سبد</p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </main>
  );
}
