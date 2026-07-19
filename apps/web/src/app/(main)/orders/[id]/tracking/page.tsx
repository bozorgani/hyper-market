import type { Metadata } from "next";
import { OrderTrackingTimeline } from "@/components/order/order-tracking-timeline";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { PageHeader } from "@/components/ui/page-header";
import { OrderStatusBadge } from "@/components/order/status-badge";
import { formatPersianDate, formatPrice } from "@/lib/utils";
import { useOrder } from "@/hooks/use-orders";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "پیگیری سفارش",
  robots: { index: false, follow: false },
};

export default async function OrderTrackingPage({ params }: { params: { id: string } }) {
  return (
    <ProtectedRoute>
      <OrderTrackingClient orderId={params.id} />
    </ProtectedRoute>
  );
}

"use client";

function OrderTrackingClient({ orderId }: { orderId: string }) {
  const { data: order, isLoading, isError, error } = useOrder(orderId);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 text-right">
        <PageHeader title="پیگیری سفارش" description="در حال بارگذاری..." />
        <Card className="mt-6 p-6">
          <div className="space-y-4">
            <div className="h-6 w-48 rounded-md bg-slate-200 animate-pulse" />
            <div className="h-4 w-72 rounded-md bg-slate-200 animate-pulse" />
            <div className="mt-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-200 animate-pulse" />
                  <div className="pt-1 space-y-2">
                    <div className="h-4 w-32 rounded-md bg-slate-200 animate-pulse" />
                    <div className="h-3 w-48 rounded-md bg-slate-200 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 text-right">
        <PageHeader title="پیگیری سفارش" description="سفارش یافت نشد." />
        <Card className="mt-6 p-6">
          <p className="text-red-600 text-sm">{error instanceof Error ? error.message : "سفارش یافت نشد."}</p>
          <Link href="/orders" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-rose-700 hover:text-rose-800">
            <ArrowLeft className="h-4 w-4" />
            بازگشت به سفارش‌ها
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 text-right">
      <PageHeader
        title={`پیگیری سفارش #${order._id.slice(-8)}`}
        description={`وضعیت فعلی سفارش ثبت‌شده در ${formatPersianDate(order.createdAt ?? new Date().toISOString())}`}
      />
      <Card className="mt-6 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <OrderStatusBadge status={order.status} />
          <span className="text-sm text-slate-500">
            مبلغ کل: {formatPrice(order.totalPrice)}
          </span>
        </div>
        <div className="mt-6">
          <OrderTrackingTimeline status={order.status} />
        </div>
      </Card>
      <div className="mt-4 flex justify-end">
        <Link href="/orders">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4 rotate-180" />
            بازگشت به سفارش‌ها
          </Button>
        </Link>
      </div>
    </div>
  );
}
