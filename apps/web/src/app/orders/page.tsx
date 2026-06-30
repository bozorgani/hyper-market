"use client";

import Link from "next/link";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { OrderCard } from "@/components/order-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyOrders } from "@/hooks/use-orders";
import { formatNumber } from "@/lib/utils";

export default function OrdersPage() {
  const orders = useMyOrders();
  const errorMessage = orders.error instanceof Error ? orders.error.message : "دریافت سفارش‌ها ناموفق بود.";

  return (
    <ProtectedRoute>
      <main className="mx-auto max-w-5xl px-4 py-8 text-right">
        <PageHeader
          title="سفارش‌های من"
          description="تمام سفارش‌های ثبت‌شده شما در این بخش نمایش داده می‌شود."
          badge={
            !orders.isLoading && !orders.isError && orders.data?.length ? (
              <div className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm">
                {formatNumber(orders.data.length)} سفارش ثبت‌شده
              </div>
            ) : undefined
          }
        />

        {orders.isLoading ? (
          <div className="mt-6 space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="p-5">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="mt-3 h-5 w-72 max-w-full" />
                <div className="mt-4 flex gap-2">
                  <Skeleton className="h-8 w-28" />
                  <Skeleton className="h-8 w-28" />
                </div>
              </Card>
            ))}
          </div>
        ) : null}

        {!orders.isLoading && orders.isError ? (
          <div className="mt-6">
            <ErrorState
              title="بارگذاری سفارش‌ها انجام نشد"
              description={errorMessage}
              actions={
                <>
                  <Button type="button" variant="outline" onClick={() => orders.refetch()}>
                    تلاش مجدد
                  </Button>
                  <Link href="/products">
                    <Button type="button">مشاهده محصولات</Button>
                  </Link>
                </>
              }
            />
          </div>
        ) : null}

        {!orders.isLoading && !orders.isError ? (
          <div className="mt-5 space-y-4">
            {(orders.data ?? []).map((order) => (
              <OrderCard key={order._id} order={order} />
            ))}
            {orders.data?.length === 0 ? (
              <EmptyState
                title="هنوز سفارشی ثبت نکرده‌اید"
                description="بعد از تکمیل خرید، وضعیت سفارش‌ها و پرداخت‌ها را از همین صفحه دنبال می‌کنید."
                actions={
                  <Link href="/products">
                    <Button type="button">شروع خرید</Button>
                  </Link>
                }
              />
            ) : null}
          </div>
        ) : null}
      </main>
    </ProtectedRoute>
  );
}
