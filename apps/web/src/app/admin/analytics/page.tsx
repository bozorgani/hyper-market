"use client";

import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminAnalyticsDashboard } from "@/features/admin/admin-api";
import { formatNumber, formatPrice } from "@/lib/utils";

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

function MiniBarChart({ items }: { items: Array<{ label: string; value: number }> }) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="grid h-56 grid-cols-[repeat(auto-fit,minmax(48px,1fr))] items-end gap-3">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col items-center gap-2">
          <div className="text-xs font-semibold text-slate-500">{formatNumber(item.value)}</div>
          <div className="flex h-40 w-full items-end rounded-2xl bg-slate-100 p-1">
            <div className="w-full rounded-xl bg-gradient-to-t from-rose-600 to-orange-400" style={{ height: `${(item.value / maxValue) * 100}%` }} />
          </div>
          <div className="text-center text-xs text-slate-500">{item.label}</div>
        </div>
      ))}
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
            <span className="truncate font-semibold text-slate-900">{item.label}</span>
            <span className="shrink-0 text-slate-500">{valueFormatter ? valueFormatter(item.value) : formatNumber(item.value)}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-rose-500" style={{ width: `${(item.value / maxValue) * 100}%` }} />
          </div>
          {item.subtitle ? <p className="mt-1 text-xs text-slate-500">{item.subtitle}</p> : null}
        </div>
      ))}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const dashboard = useAdminAnalyticsDashboard();
  const data = dashboard.data as AnalyticsDashboard | undefined;
  const errorMessage = dashboard.error instanceof Error ? dashboard.error.message : "دریافت داده‌های آنالیتیکس ناموفق بود.";

  const revenueBars = (data?.revenue?.revenueByDay ?? []).slice(-7).map((item) => ({
    label: item._id,
    value: item.revenue,
  }));

  const funnelItems = (data?.funnel?.steps ?? []).map((step) => ({
    key: step.name,
    label: funnelLabels[step.name] ?? step.name,
    value: step.count,
  }));

  const topSearchItems = (data?.search?.topSearchQueries ?? []).slice(0, 8).map((item) => ({
    key: item.query,
    label: item.query,
    value: item.count,
    subtitle: item.noResultCount ? `${formatNumber(item.noResultCount)} بدون نتیجه` : "دارای نتیجه",
  }));

  const mostViewedItems = (data?.products?.mostViewed ?? []).slice(0, 8).map((item) => ({
    key: item.productId,
    label: item.productId,
    value: item.count,
  }));

  const conversionItems = (data?.products?.conversionRatePerProduct ?? []).slice(0, 8).map((item) => ({
    key: item.productId,
    label: item.productId,
    value: item.conversionRate,
    subtitle: `${formatNumber(item.views)} بازدید · ${formatNumber(item.addToCart)} افزودن به سبد`,
  }));

  return (
    <main className="space-y-5 text-right">
      <PageHeader title="آنالیتیکس فروشگاه" description="تحلیل رفتار کاربران، درآمد، جستجو و قیف خرید با نمودارها و شاخص‌های خلاصه" />

      {dashboard.isLoading ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 w-full" />)}
        </section>
      ) : null}

      {dashboard.isError ? <ErrorState title="بارگذاری آنالیتیکس انجام نشد" description={errorMessage} actions={undefined} /> : null}

      {!dashboard.isLoading && !dashboard.isError ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AdminStatCard title="درآمد امروز" value={formatPrice(data?.revenue?.dailyRevenue ?? 0)} />
            <AdminStatCard title="درآمد هفتگی" value={formatPrice(data?.revenue?.weeklyRevenue ?? 0)} />
            <AdminStatCard title="درآمد ماهانه" value={formatPrice(data?.revenue?.monthlyRevenue ?? 0)} />
            <AdminStatCard title="کاربران فعال" value={data?.activeUsers ?? 0} />
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
            <Card className="p-5">
              <h2 className="text-lg font-black">روند درآمد روزانه</h2>
              <p className="mt-2 text-sm text-slate-500">نمایی از تغییرات درآمد در آخرین روزهای ثبت‌شده</p>
              <div className="mt-6">
                {revenueBars.length > 0 ? <MiniBarChart items={revenueBars} /> : <EmptyState title="داده درآمد روزانه موجود نیست" description="برای نمایش نمودار درآمد، رویدادهای درآمدی بیشتری لازم است." />}
              </div>
            </Card>
            <Card className="p-5">
              <h2 className="text-lg font-black">قیف خرید</h2>
              <p className="mt-2 text-sm text-slate-500">پیشروی کاربران از مشاهده محصول تا پرداخت موفق</p>
              <div className="mt-6">
                {funnelItems.length > 0 ? <ProgressList items={funnelItems} /> : <EmptyState title="قیف خرید خالی است" description="هنوز داده کافی برای رسم قیف خرید ثبت نشده است." />}
              </div>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <h2 className="text-lg font-black">جستجوهای برتر</h2>
              <p className="mt-2 text-sm text-slate-500">عبارت‌هایی که بیشترین جستجو را در فروشگاه داشته‌اند</p>
              <div className="mt-6">
                {topSearchItems.length > 0 ? <ProgressList items={topSearchItems} /> : <EmptyState title="جستجویی ثبت نشده است" description="هنوز داده‌ای برای تحلیل جستجوها در دسترس نیست." />}
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="text-lg font-black">پربازدیدترین محصولات</h2>
              <p className="mt-2 text-sm text-slate-500">محصولاتی که بیشترین بازدید را در بازه فعلی داشته‌اند</p>
              <div className="mt-6">
                {mostViewedItems.length > 0 ? <ProgressList items={mostViewedItems} /> : <EmptyState title="بازدید محصولی ثبت نشده است" description="پس از ثبت رویدادهای view، این بخش تکمیل می‌شود." />}
              </div>
            </Card>
          </section>

          <section>
            <Card className="p-5">
              <h2 className="text-lg font-black">نرخ تبدیل محصولات</h2>
              <p className="mt-2 text-sm text-slate-500">مقایسه نسبت بازدید تا افزودن به سبد برای محصولات برتر</p>
              <div className="mt-6">
                {conversionItems.length > 0 ? <ProgressList items={conversionItems} valueFormatter={(value) => `${formatNumber(value)}٪`} /> : <EmptyState title="نرخ تبدیل قابل محاسبه نیست" description="داده بازدید و افزودن به سبد برای محصولات کافی نیست." />}
              </div>
            </Card>
          </section>
        </>
      ) : null}
    </main>
  );
}
