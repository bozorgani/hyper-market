"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock, MapPin, PackageCheck, ReceiptText, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrder, usePayment } from "@/hooks/use-orders";
import { formatPersianDate, formatPrice, translateOrderStatus, translatePaymentMethod, translatePaymentStatus } from "@/lib/utils";

type OrderItemSnapshot = {
  name?: string;
  quantity?: number;
  priceAtPurchase?: number;
};

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") ?? "";
  const shortOrderId = orderId ? orderId.slice(-8) : null;
  const order = useOrder(orderId);
  const payment = usePayment(orderId);
  const isLoadingDetails = Boolean(orderId) && (order.isLoading || payment.isLoading);
  const detailError = order.error instanceof Error ? order.error.message : payment.error instanceof Error ? payment.error.message : "دریافت وضعیت سفارش ناموفق بود.";
  const paymentIsPaid = payment.data?.status === "paid";

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center px-4 py-10">
      <Card className="w-full p-8 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
        <h1 className="mt-5 text-3xl font-black">سفارش شما ثبت شد</h1>
        <p className="mt-3 leading-7 text-slate-500">
          سفارش شما با موفقیت ثبت شد و پرداخت در محل تأیید گردید.
        </p>

        {shortOrderId ? (
          <div className="mt-6 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            شماره پیگیری سفارش: {shortOrderId}
          </div>
        ) : (
          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-right text-sm leading-7 text-amber-800">
            <AlertTriangle className="mt-1 h-5 w-5 shrink-0" />
            <p>شناسه سفارش در آدرس صفحه وجود ندارد.</p>
          </div>
        )}

        {isLoadingDetails ? (
          <div className="mt-6 grid gap-3 text-right sm:grid-cols-2">
            <Card className="p-4"><Skeleton className="h-5 w-28" /><Skeleton className="mt-4 h-8 w-full" /></Card>
            <Card className="p-4"><Skeleton className="h-5 w-28" /><Skeleton className="mt-4 h-8 w-full" /></Card>
          </div>
        ) : null}

        {orderId && !isLoadingDetails && (order.isError || payment.isError) ? (
          <div className="mt-6">
            <ErrorState title="بررسی وضعیت سفارش کامل نشد" description={detailError} actions={<Button variant="outline" onClick={() => { order.refetch(); payment.refetch(); }}><RefreshCw className="h-4 w-4" /> تلاش مجدد</Button>} />
          </div>
        ) : null}

        {order.data && !order.isError ? (
          <>
            <div className="mt-6 grid gap-3 text-right sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <ReceiptText className="mb-3 h-5 w-5 text-emerald-600" />
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black text-slate-900">جزئیات سفارش</p>
                  <Badge className="bg-blue-50 text-blue-700">{translateOrderStatus(order.data.status)}</Badge>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-500">مبلغ کل: {formatPrice(order.data.totalPrice)}</p>
                <p className="text-sm leading-7 text-slate-500">تاریخ ثبت: {formatPersianDate(order.data.createdAt)}</p>
                <p className="text-sm leading-7 text-slate-500">تعداد اقلام: {order.data.items.length}</p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <PackageCheck className="mb-3 h-5 w-5 text-rose-600" />
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black text-slate-900">وضعیت پرداخت</p>
                  <Badge className={paymentIsPaid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}>
                    {translatePaymentStatus(payment.data?.status)}
                  </Badge>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-500">روش: {translatePaymentMethod(payment.data?.method)}</p>
                <p className="text-sm leading-7 text-slate-500">مبلغ: {formatPrice(payment.data?.amount ?? order.data.totalPrice)}</p>
              </div>
            </div>

            {/* Order Items with shipping note */}
            {order.data.items && order.data.items.length > 0 && (
              <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4 text-right">
                <p className="font-black text-sm mb-3">اقلام سفارش</p>
                <div className="space-y-2 text-sm">
                  {order.data.items.map((item: OrderItemSnapshot, idx: number) => (
                    <div key={idx} className="flex justify-between border-b pb-2 last:border-0">
                      <div>
                        <span className="font-medium">{item.name || `محصول`}</span>
                        <span className="text-slate-400 ml-2">×{item.quantity}</span>
                      </div>
                      <span className="font-semibold">{formatPrice((item.priceAtPurchase || 0) * (item.quantity || 1))}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t flex justify-between text-sm font-bold">
                  <span>جمع کل (شامل ارسال)</span>
                  <span>{formatPrice(order.data.totalPrice)}</span>
                </div>
              </div>
            )}

            {order.data?.deliveryAddress || order.data?.deliveryWindow ? (
              <div className="mt-4 grid gap-3 text-right sm:grid-cols-2">
                {order.data.deliveryAddress && (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <MapPin className="mb-3 h-5 w-5 text-sky-600" />
                    <p className="font-black text-slate-900">آدرس تحویل</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {order.data.deliveryAddress.province}، {order.data.deliveryAddress.city}، {order.data.deliveryAddress.addressLine}
                    </p>
                  </div>
                )}
                {order.data.deliveryWindow && (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <Clock className="mb-3 h-5 w-5 text-violet-600" />
                    <p className="font-black text-slate-900">زمان ارسال</p>
                    <p className="text-sm text-slate-600 mt-1">{formatPersianDate(order.data.deliveryWindow.date)} — {order.data.deliveryWindow.timeSlot}</p>
                  </div>
                )}
              </div>
            ) : null}
          </>
        ) : null}

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/orders"><Button>مشاهده سفارش‌ها</Button></Link>
          <Link href="/products"><Button variant="outline">ادامه خرید</Button></Link>
        </div>
      </Card>
    </main>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={null}>
      <OrderSuccessContent />
    </Suspense>
  );
}
