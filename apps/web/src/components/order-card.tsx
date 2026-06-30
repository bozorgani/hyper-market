"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { usePayment } from "@/hooks/use-orders";
import { formatNumber, formatPersianDate, formatPrice, translateOrderStatus, translatePaymentStatus } from "@/lib/utils";
import type { Order } from "@/types/domain";

export function OrderCard({ order }: { order: Order }) {
  const payment = usePayment(order._id);
  const paymentLabel = payment.isLoading
    ? "در حال بررسی پرداخت"
    : payment.isError
      ? "وضعیت پرداخت نامشخص"
      : translatePaymentStatus(payment.data?.status);

  return (
    <Card className="p-5 text-right">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-black">سفارش شماره {order._id.slice(-8)}</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            {formatNumber(order.items.length)} قلم کالا · {formatPrice(order.totalPrice)} · {formatPersianDate(order.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-blue-50 text-blue-700">{translateOrderStatus(order.status)}</Badge>
          <Badge className="bg-emerald-50 text-emerald-700">{paymentLabel}</Badge>
        </div>
      </div>
    </Card>
  );
}
