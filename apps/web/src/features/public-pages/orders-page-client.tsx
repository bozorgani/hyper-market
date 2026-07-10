"use client";

import { useMemo, useState } from "react";
import { LinkButton } from "@/components/ui/link-button";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { OrderCard } from "@/components/order-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyOrders, usePaymentsBatch } from "@/hooks/use-orders";
import { isCustomerRole } from "@/lib/auth";
import { useAuthStore } from "@/store/auth-store";
import { formatNumber } from "@/lib/utils";
import type { OrderStatus, Payment } from "@/types/domain";

const statuses: Array<{ value: OrderStatus | "all"; label: string }> = [
  { value: "all", label: "همه" },
  { value: "pending", label: "در انتظار" },
  { value: "paid", label: "پرداخت‌شده" },
  { value: "processing", label: "در حال پردازش" },
  { value: "shipped", label: "ارسال‌شده" },
  { value: "delivered", label: "تحویل‌شده" },
  { value: "cancelled", label: "لغوشده" },
];

export function OrdersPageClient() {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const isCustomer = isCustomerRole(user?.role);
  const orders = useMyOrders(Boolean(hydrated && isCustomer));
  const orderIds = useMemo(
    () => (orders.data ?? []).map((order) => order._id),
    [orders.data],
  );
  const payments = usePaymentsBatch(orderIds);
  const paymentMap = useMemo(() => {
    const map = new Map<string, Payment>();
    for (const payment of payments.data ?? []) {
      map.set(payment.orderId, payment);
    }
    return map;
  }, [payments.data]);
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [query, setQuery] = useState("");
  const errorMessage = orders.error instanceof Error ? orders.error.message : "دریافت سفارش‌ها ناموفق بود.";

  const filteredOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return (orders.data ?? []).filter((order) => {
      const matchesStatus = status === "all" || order.status === status;
      const matchesQuery = normalizedQuery ? order._id.toLowerCase().includes(normalizedQuery) : true;
      return matchesStatus && matchesQuery;
    });
  }, [orders.data, query, status]);

  const latestOrder = orders.data?.[0];

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-5xl px-4 py-8 text-right">
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
                  <LinkButton href="/products">مشاهده محصولات</LinkButton>
                </>
              }
            />
          </div>
        ) : null}

        {!orders.isLoading && !orders.isError && orders.data?.length ? (
          <Card className="mt-6 p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جستجو بر اساس شماره سفارش..." />
              <Button type="button" variant="outline" onClick={() => { setQuery(""); setStatus("all"); }}>
                پاک‌کردن فیلترها
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {statuses.map((item) => (
                <Button key={item.value} type="button" variant={status === item.value ? "default" : "outline"} onClick={() => setStatus(item.value)}>
                  {item.label}
                </Button>
              ))}
            </div>
          </Card>
        ) : null}

        {!orders.isLoading && !orders.isError && latestOrder ? (
          <Card className="mt-5 border-emerald-100 bg-emerald-50/60 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-emerald-900">آخرین سفارش شما</p>
                <p className="mt-1 text-sm leading-7 text-emerald-700">
                  سفارش #{latestOrder._id.slice(-8)} با مبلغ {formatNumber(latestOrder.totalPrice)} تومان ثبت شده است.
                </p>
              </div>
              <LinkButton href={`/order/success?orderId=${latestOrder._id}`}>مشاهده وضعیت</LinkButton>
            </div>
          </Card>
        ) : null}

        {!orders.isLoading && !orders.isError ? (
          <div className="mt-5 space-y-4">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                payment={paymentMap.get(order._id)}
                paymentLoading={payments.isLoading}
                paymentError={payments.isError}
                onRetryPayment={() => payments.refetch()}
              />
            ))}
            {orders.data?.length === 0 ? (
              <EmptyState
                title="هنوز سفارشی ثبت نکرده‌اید"
                description="بعد از تکمیل خرید، وضعیت سفارش‌ها و پرداخت‌ها را از همین صفحه دنبال می‌کنید."
                actions={
                  <LinkButton href="/products">شروع خرید</LinkButton>
                }
              />
            ) : null}
            {orders.data?.length && filteredOrders.length === 0 ? (
              <EmptyState
                title="سفارشی با این فیلتر یافت نشد"
                description="عبارت جستجو یا وضعیت انتخاب‌شده را تغییر دهید."
                actions={<Button type="button" onClick={() => { setQuery(""); setStatus("all"); }}>بازنشانی فیلترها</Button>}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </ProtectedRoute>
  );
}
