"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import type { Order, Payment } from "@/types/domain";
import { PaymentStatusBadge } from "./admin-status-badge";

export function PaymentRow({
  order,
  payment,
  onOpenDetail,
}: {
  order: Order;
  payment?: Payment | null;
  onOpenDetail: (orderId: string) => void;
}) {
  // `payment === undefined` means the parent's batch query is still loading;
  // `null`/value means it resolved. The parent passes the resolved map, so this
  // row no longer fires its own GET /payments/:orderId (fixes the N+1).
  const loading = payment === undefined;

  return (
    <tr className="border-b border-slate-100 transition hover:bg-slate-50/80">
      <td className="p-4 font-bold">#{order._id.slice(-8)}</td>
      <td className="p-4">{formatPrice(order.totalPrice)}</td>
      <td className="p-4"><PaymentStatusBadge status={payment?.status} /></td>
      <td className="p-4 ltr text-left">{payment?.transactionId ?? (loading ? "—" : "-")}</td>
      <td className="p-4">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenDetail(order._id)}>جزئیات پرداخت</Button>
          <Link href={`/admin/orders/${order._id}`}><Button type="button" variant="ghost">مشاهده سفارش</Button></Link>
        </div>
      </td>
    </tr>
  );
}
