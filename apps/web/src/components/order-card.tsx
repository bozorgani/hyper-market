"use client";

import { RefreshCw } from "lucide-react";
import { LinkButton } from "@/components/ui/link-button";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/order/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatNumber, formatPersianDate, formatPrice } from "@/lib/utils";
import type { Order, OrderStatus, Payment } from "@/types/domain";

const orderProgress: OrderStatus[] = ["pending", "paid", "processing", "shipped", "delivered"];

function progressIndex(status: OrderStatus) {
  if (status === "cancelled") return -1;
  return orderProgress.indexOf(status);
}

export function OrderCard({
  order,
  payment,
  paymentLoading,
  paymentError,
  onRetryPayment,
}: {
  order: Order;
  payment?: Payment | null;
  paymentLoading?: boolean;
  paymentError?: boolean;
  onRetryPayment?: () => void;
}) {
  // The parent fetches payments in a single batch and passes the result down,
  // so this card no longer fires its own GET /payments/:orderId (fixes N+1).
  // `payment === undefined && paymentLoading` => still loading (skeleton).
  const loading = Boolean(paymentLoading) && payment === undefined;
  const data = payment ?? null;
  const activeProgressIndex = progressIndex(order.status);
  const isCancelled = order.status === "cancelled";
  const paymentErrorMessage = "وضعیت پرداخت نامشخص است.";

  return (
    <Card className="p-5 text-right">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-black">سفارش شماره {order._id.slice(-8)}</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            {formatNumber(order.items.length)} قلم کالا · {formatPrice(order.totalPrice)} · {formatPersianDate(order.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <OrderStatusBadge status={order.status} />
          {loading ? <PaymentStatusBadge /> : <PaymentStatusBadge status={data?.status} />}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <div className="grid gap-3 sm:grid-cols-5">
          {orderProgress.map((status, index) => {
            const isDone = !isCancelled && activeProgressIndex >= index;
            const isActive = !isCancelled && activeProgressIndex === index;

            return (
              <div key={status} className="flex items-center gap-2 sm:flex-col sm:items-start">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                    isDone ? "bg-green-500 text-white" : isActive ? "bg-rose-600 text-white" : "bg-white text-slate-400 ring-1 ring-slate-200"
                  }`}
                >
                  {isDone ? "✓" : index + 1}
                </span>
                <span className={`text-xs font-semibold ${isDone || isActive ? "text-slate-900" : "text-slate-400"}`}>
                  {status === "pending"
                    ? "در انتظار"
                    : status === "paid"
                      ? "پرداخت‌شده"
                      : status === "processing"
                        ? "پردازش"
                        : status === "shipped"
                          ? "ارسال"
                          : "تحویل"}
                </span>
              </div>
            );
          })}
        </div>
        {isCancelled ? <p className="mt-3 text-sm text-red-600">این سفارش لغو شده و روند پردازش آن متوقف است.</p> : null}
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm leading-7 text-slate-500">
          {paymentError ? (
            <p className="text-red-600">{paymentErrorMessage}</p>
          ) : data?.transactionId ? (
            <p className="truncate">کد تراکنش: {data.transactionId}</p>
          ) : (
            <p>برای مشاهده جزئیات بیشتر، وضعیت سفارش را باز کنید.</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {paymentError && onRetryPayment ? (
            <Button type="button" variant="outline" onClick={onRetryPayment}>
              <RefreshCw className="h-4 w-4" />
              بررسی مجدد پرداخت
            </Button>
          ) : null}
          <LinkButton href={`/order/success?orderId=${order._id}`} variant="outline">جزئیات سفارش</LinkButton>
        </div>
      </div>
    </Card>
  );
}
