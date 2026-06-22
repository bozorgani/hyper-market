"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import { usePayment } from "@/hooks/use-orders";
import type { Order } from "@/types/domain";

export function OrderCard({ order }: { order: Order }) {
  const payment = usePayment(order._id);

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-black">Order #{order._id.slice(-8)}</p>
          <p className="mt-1 text-sm text-slate-500">{order.items.length} items · {formatPrice(order.totalPrice)}</p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-blue-50 text-blue-700">{order.status}</Badge>
          <Badge className="bg-emerald-50 text-emerald-700">{payment.data?.status ?? "payment unknown"}</Badge>
        </div>
      </div>
    </Card>
  );
}
