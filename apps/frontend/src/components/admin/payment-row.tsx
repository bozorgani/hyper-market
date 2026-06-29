"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAdminPayment } from "@/features/admin/admin-api";
import { formatPrice } from "@/lib/utils";
import type { Order } from "@/types/domain";
import { PaymentStatusBadge } from "./admin-status-badge";

export function PaymentRow({
  order,
  onOpenDetail,
  onPaymentLoaded,
}: {
  order: Order;
  onOpenDetail: (orderId: string) => void;
  onPaymentLoaded?: (payload: { orderId: string; status?: string; transactionId?: string | null }) => void;
}) {
  const payment = useAdminPayment(order._id);

  useEffect(() => {
    if (!onPaymentLoaded) return;
    onPaymentLoaded({
      orderId: order._id,
      status: payment.data?.status,
      transactionId: payment.data?.transactionId ?? null,
    });
  }, [onPaymentLoaded, order._id, payment.data?.status, payment.data?.transactionId]);

  return (
    <tr className="border-b border-slate-100 transition hover:bg-slate-50/80">
      <td className="p-4 font-bold">#{order._id.slice(-8)}</td>
      <td className="p-4">{formatPrice(order.totalPrice)}</td>
      <td className="p-4"><PaymentStatusBadge status={payment.data?.status} /></td>
      <td className="p-4 ltr text-left">{payment.data?.transactionId ?? "-"}</td>
      <td className="p-4">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenDetail(order._id)}>جزئیات پرداخت</Button>
          <Link href={`/admin/orders/${order._id}`}><Button type="button" variant="ghost">مشاهده سفارش</Button></Link>
        </div>
      </td>
    </tr>
  );
}
