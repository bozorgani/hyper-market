"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice, translatePaymentStatus } from "@/lib/utils";
import { useAdminPayment } from "@/features/admin/admin-api";
import type { Order } from "@/types/domain";

export function PaymentRow({ order }: { order: Order }) {
  const payment = useAdminPayment(order._id);

  return (
    <tr>
      <td className="p-4 font-bold">#{order._id.slice(-8)}</td>
      <td className="p-4">{formatPrice(order.totalPrice)}</td>
      <td className="p-4"><Badge>{translatePaymentStatus(payment.data?.status)}</Badge></td>
      <td className="p-4 ltr text-left">{payment.data?.transactionId ?? "-"}</td>
      <td className="p-4"><Link href={`/admin/orders/${order._id}`}><Button variant="outline">مشاهده سفارش</Button></Link></td>
    </tr>
  );
}
