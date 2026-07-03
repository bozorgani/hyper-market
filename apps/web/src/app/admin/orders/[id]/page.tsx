"use client";

import { useParams } from "next/navigation";
import { OrderStatusBadge } from "@/components/admin/admin-status-badge";
import { OrderStatusTimeline } from "@/components/admin/order-status-timeline";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminOrder } from "@/features/admin/admin-api";
import { formatNumber, formatPersianDate, formatPrice } from "@/lib/utils";

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderQuery = useAdminOrder(params.id);
  const order = orderQuery.data;
  const errorMessage = orderQuery.error instanceof Error ? orderQuery.error.message : "دریافت اطلاعات سفارش ناموفق بود.";

  return (
    <main className="space-y-5 text-right">
      <PageHeader title={`جزئیات سفارش #${params.id.slice(-8)}`} description="نمای کامل وضعیت سفارش، مبلغ، اقلام و تایم‌لاین پردازش در این صفحه نمایش داده می‌شود." />

      {orderQuery.isLoading ? (
        <Card className="p-5">
          <Skeleton className="h-8 w-48" />
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </Card>
      ) : null}

      {!orderQuery.isLoading && orderQuery.isError ? <ErrorState title="بارگذاری سفارش انجام نشد" description={errorMessage} actions={undefined} /> : null}
      {!orderQuery.isLoading && !orderQuery.isError && !order ? <EmptyState title="سفارش پیدا نشد" description="ممکن است سفارش حذف شده باشد یا شناسه واردشده معتبر نباشد." /> : null}

      {order ? (
        <>
          <Card className="p-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-slate-500">وضعیت فعلی</p>
                <div className="mt-2"><OrderStatusBadge status={order.status} /></div>
              </div>
              <div>
                <p className="text-sm text-slate-500">تاریخ ثبت</p>
                <p className="mt-2 font-bold text-slate-900">{formatPersianDate(order.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">مبلغ کل</p>
                <p className="mt-2 font-bold text-slate-900">{formatPrice(order.totalPrice)}</p>
              </div>
            </div>
          </Card>

          <OrderStatusTimeline status={order.status} />

          {order.deliveryAddress || order.deliveryWindow ? (
            <Card className="p-5">
              <div className="grid gap-4 md:grid-cols-2">
                {order.deliveryAddress ? (
                  <div>
                    <p className="text-sm text-slate-500">آدرس تحویل</p>
                    <p className="mt-2 font-bold leading-7 text-slate-900">
                      {order.deliveryAddress.province}، {order.deliveryAddress.city}، {order.deliveryAddress.addressLine}
                    </p>
                    <p className="mt-1 text-sm leading-7 text-slate-500">
                      تحویل‌گیرنده: {order.deliveryAddress.recipientName} · {order.deliveryAddress.phoneNumber}
                    </p>
                    {order.deliveryAddress.plate || order.deliveryAddress.unit ? (
                      <p className="text-sm leading-7 text-slate-500">پلاک {order.deliveryAddress.plate ?? "-"} · واحد {order.deliveryAddress.unit ?? "-"}</p>
                    ) : null}
                    {order.deliveryAddress.postalCode ? <p className="text-sm leading-7 text-slate-500">کد پستی: {order.deliveryAddress.postalCode}</p> : null}
                  </div>
                ) : null}
                {order.deliveryWindow ? (
                  <div>
                    <p className="text-sm text-slate-500">زمان ارسال</p>
                    <p className="mt-2 font-bold text-slate-900">{formatPersianDate(order.deliveryWindow.date)}</p>
                    <p className="mt-1 text-sm leading-7 text-slate-500">بازه تحویل: {order.deliveryWindow.timeSlot}</p>
                  </div>
                ) : null}
              </div>
            </Card>
          ) : null}

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 text-sm text-slate-500">
              <p>اقلام سفارش</p>
              <p>{formatNumber(order.items.length)} قلم</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-right text-sm">
                <thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">محصول</th><th className="p-4">تعداد</th><th className="p-4">قیمت خرید</th></tr></thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.productId} className="border-b border-slate-100 transition hover:bg-slate-50/80">
                      <td className="p-4 ltr text-left font-mono text-xs">{item.productId}</td>
                      <td className="p-4">{formatNumber(item.quantity)}</td>
                      <td className="p-4">{formatPrice(item.priceAtPurchase)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : null}
    </main>
  );
}
