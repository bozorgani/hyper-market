"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock, MapPin, PackageCheck, ReceiptText, RefreshCw, ShoppingBag, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrder, usePayment } from "@/hooks/use-orders";
import { formatPersianDate, formatPrice, translateOrderStatus, translatePaymentMethod, translatePaymentStatus } from "@/lib/utils";

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
        <h1 className="mt-5 text-3xl font-black">پرداخت سفارش موفق بود</h1>
        <p className="mt-3 leading-7 text-slate-500">
          سفارش شما با موفقیت ثبت و پرداخت mock آن تأیید شد. آخرین وضعیت سفارش و پرداخت در همین صفحه بررسی می‌شود.
        </p>

        {shortOrderId ? (
          <div className="mt-6 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            شماره پیگیری سفارش: {shortOrderId}
          </div>
        ) : (
          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-right text-sm leading-7 text-amber-800">
            <AlertTriangle className="mt-1 h-5 w-5 shrink-0" />
            <p>شناسه سفارش در آدرس صفحه وجود ندارد. برای مشاهده وضعیت دقیق، از صفحه سفارش‌ها وارد شوید.</p>
          </div>
        )}

        {isLoadingDetails ? (
          <div className="mt-6 grid gap-3 text-right sm:grid-cols-2">
            <Card className="p-4">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="mt-4 h-8 w-full" />
              <Skeleton className="mt-3 h-4 w-32" />
            </Card>
            <Card className="p-4">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="mt-4 h-8 w-full" />
              <Skeleton className="mt-3 h-4 w-32" />
            </Card>
          </div>
        ) : null}

        {orderId && !isLoadingDetails && (order.isError || payment.isError) ? (
          <div className="mt-6">
            <ErrorState
              title="بررسی وضعیت سفارش کامل نشد"
              description={detailError}
              actions={
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    order.refetch();
                    payment.refetch();
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                  تلاش مجدد
                </Button>
              }
            />
          </div>
        ) : null}

        {order.data && !order.isError ? (
          <div className="mt-6 grid gap-3 text-right sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <ReceiptText className="mb-3 h-5 w-5 text-emerald-600" />
              <div className="flex items-center justify-between gap-3">
                <p className="font-black text-slate-900">جزئیات سفارش</p>
                <Badge className="bg-blue-50 text-blue-700">{translateOrderStatus(order.data.status)}</Badge>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-500">مبلغ: {formatPrice(order.data.totalPrice)}</p>
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
              <p className="text-sm leading-7 text-slate-500">مبلغ پرداخت: {formatPrice(payment.data?.amount ?? order.data.totalPrice)}</p>
              {payment.data?.transactionId ? <p className="truncate text-sm leading-7 text-slate-500">کد تراکنش: {payment.data.transactionId}</p> : null}
            </div>
          </div>
        ) : null}

        {order.data?.deliveryAddress || order.data?.deliveryWindow ? (
          <div className="mt-4 grid gap-3 text-right sm:grid-cols-2">
            {order.data.deliveryAddress ? (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <MapPin className="mb-3 h-5 w-5 text-sky-600" />
                <p className="font-black text-slate-900">آدرس تحویل</p>
                <p className="mt-3 text-sm leading-7 text-slate-500">
                  {order.data.deliveryAddress.province}، {order.data.deliveryAddress.city}، {order.data.deliveryAddress.addressLine}
                </p>
                <p className="text-sm leading-7 text-slate-500">تحویل‌گیرنده: {order.data.deliveryAddress.recipientName} · {order.data.deliveryAddress.phoneNumber}</p>
                {order.data.deliveryAddress.plate || order.data.deliveryAddress.unit ? <p className="text-sm leading-7 text-slate-500">پلاک {order.data.deliveryAddress.plate ?? "-"} · واحد {order.data.deliveryAddress.unit ?? "-"}</p> : null}
              </div>
            ) : null}
            {order.data.deliveryWindow ? (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <Clock className="mb-3 h-5 w-5 text-violet-600" />
                <p className="font-black text-slate-900">زمان ارسال</p>
                <p className="mt-3 text-sm leading-7 text-slate-500">تاریخ: {formatPersianDate(order.data.deliveryWindow.date)}</p>
                <p className="text-sm leading-7 text-slate-500">بازه تحویل: {order.data.deliveryWindow.timeSlot}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-8 grid gap-3 text-right md:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <PackageCheck className="mb-3 h-5 w-5 text-emerald-600" />
            <p className="font-black text-slate-900">وضعیت سفارش</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              می‌توانید روند ثبت و پرداخت سفارش را از صفحه سفارش‌ها دنبال کنید.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <ShoppingBag className="mb-3 h-5 w-5 text-rose-600" />
            <p className="font-black text-slate-900">ادامه خرید</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              هر زمان خواستید می‌توانید دوباره به لیست محصولات برگردید و خرید جدیدی شروع کنید.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <UserRound className="mb-3 h-5 w-5 text-sky-600" />
            <p className="font-black text-slate-900">حساب کاربری</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              اطلاعات نشست و دسترسی سریع به سفارش‌های شما از پروفایل قابل مشاهده است.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/orders">
            <Button type="button">مشاهده سفارش‌ها</Button>
          </Link>
          <Link href="/products">
            <Button type="button" variant="outline">بازگشت به محصولات</Button>
          </Link>
          <Link href="/profile">
            <Button type="button" variant="ghost">رفتن به پروفایل</Button>
          </Link>
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
