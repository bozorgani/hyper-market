"use client";


import { useParams } from "next/navigation";
import { motion } from "@/components/ui/csp-motion";
import { Package, Calendar, MapPin, Clock, ArrowRight } from "lucide-react";
import { OrderStatusBadge } from "@/components/order/status-badge";
import { OrderStatusTimeline } from "@/components/admin/order-status-timeline";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminOrder } from "@/features/admin/admin-api";
import { formatNumber, formatPersianDate, formatPrice } from "@/lib/utils";
import Link from "next/link";

export function AdminOrderDetailClient() {
  const params = useParams<{ id: string }>();
  const orderQuery = useAdminOrder(params.id);
  const order = orderQuery.data;
  const errorMessage = orderQuery.error instanceof Error ? orderQuery.error.message : "دریافت اطلاعات سفارش ناموفق بود.";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin/orders" className="flex items-center gap-1 text-sm text-slate-400 transition hover:text-emerald-600">
              <ArrowRight className="h-4 w-4" />
              سفارش‌ها
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-sm text-slate-500">#{params.id.slice(-8)}</span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-slate-900">جزئیات سفارش</h1>
        </div>
        {order && <OrderStatusBadge status={order.status} />}
      </div>

      {orderQuery.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      ) : null}

      {!orderQuery.isLoading && orderQuery.isError ? <ErrorState title="بارگذاری سفارش انجام نشد" description={errorMessage} /> : null}
      {!orderQuery.isLoading && !orderQuery.isError && !order ? <EmptyState title="سفارش پیدا نشد" description="ممکن است حذف شده باشد." /> : null}

      {order ? (
        <>
          {/* Info Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <Calendar className="h-4 w-4" />
                <span className="text-xs font-medium">تاریخ ثبت</span>
              </div>
              <p className="mt-3 text-lg font-bold text-slate-900">{formatPersianDate(order.createdAt)}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <Package className="h-4 w-4" />
                <span className="text-xs font-medium">تعداد اقلام</span>
              </div>
              <p className="mt-3 text-lg font-bold text-slate-900">{formatNumber(order.items.length)} قلم</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <Package className="h-4 w-4" />
                <span className="text-xs font-medium">مبلغ کل</span>
              </div>
              <p className="mt-3 text-lg font-bold text-emerald-600">{formatPrice(order.totalPrice)}</p>
            </motion.div>
          </div>

          {/* Timeline */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <OrderStatusTimeline status={order.status} />
          </motion.div>

          {/* Address & Time */}
          {(order.deliveryAddress || order.deliveryWindow) && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="grid gap-4 md:grid-cols-2">
              {order.deliveryAddress ? (
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-400">
                    <MapPin className="h-4 w-4" />
                    <span className="text-xs font-medium">آدرس تحویل</span>
                  </div>
                  <div className="mt-3 space-y-1.5 text-sm leading-7">
                    <p className="font-bold text-slate-900">
                      {order.deliveryAddress.province}، {order.deliveryAddress.city}، {order.deliveryAddress.addressLine}
                    </p>
                    <p className="text-slate-500">تحویل‌گیرنده: {order.deliveryAddress.recipientName} · {order.deliveryAddress.phoneNumber}</p>
                    {(order.deliveryAddress.plate || order.deliveryAddress.unit) && (
                      <p className="text-slate-400">پلاک {order.deliveryAddress.plate ?? "-"} · واحد {order.deliveryAddress.unit ?? "-"}</p>
                    )}
                    {order.deliveryAddress.postalCode && <p className="text-slate-400">کد پستی: {order.deliveryAddress.postalCode}</p>}
                  </div>
                </div>
              ) : null}
              {order.deliveryWindow ? (
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-medium">زمان ارسال</span>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <p className="text-sm font-bold text-slate-900">{formatPersianDate(order.deliveryWindow.date)}</p>
                    <p className="text-sm text-slate-500">بازه: {order.deliveryWindow.timeSlot}</p>
                  </div>
                </div>
              ) : null}
            </motion.div>
          )}

          {/* Order Items */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-700">اقلام سفارش</span>
              </div>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">{formatNumber(order.items.length)} قلم</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-right text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-400">نام محصول</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-400">تعداد</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-400">قیمت خرید</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {order.items.map((item) => (
                    <tr key={item.product?.name || item.productId.slice(-6)} className="transition hover:bg-slate-50/50">
                      <td className="px-5 py-3.5 ltr text-left font-mono text-xs text-slate-500">{item.product?.name || item.productId.slice(-6)}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-700">{formatNumber(item.quantity)}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-900">{formatPrice(item.priceAtPurchase)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      ) : null}
    </div>
  );
}