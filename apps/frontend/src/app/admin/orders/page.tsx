"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPersianDate, formatPrice, translateOrderStatus } from "@/lib/utils";
import { useAdminOrders, useUpdateOrderStatus } from "@/features/admin/admin-api";
import type { OrderStatus } from "@/types/domain";

const statuses: Array<{ value: OrderStatus | "all"; label: string }> = [
  { value: "all", label: "همه" },
  { value: "pending", label: "در انتظار" },
  { value: "paid", label: "پرداخت‌شده" },
  { value: "shipped", label: "ارسال‌شده" },
  { value: "delivered", label: "تحویل‌شده" },
  { value: "cancelled", label: "لغوشده" },
];

export default function AdminOrdersPage() {
  const orders = useAdminOrders();
  const updateStatus = useUpdateOrderStatus();
  const [status, setStatus] = useState<OrderStatus | "all">("all");

  const filteredOrders = useMemo(() => {
    const items = orders.data ?? [];
    return status === "all" ? items : items.filter((order) => order.status === status);
  }, [orders.data, status]);

  return (
    <main className="space-y-5 text-right">
      <div>
        <h1 className="text-2xl font-black">مدیریت سفارش‌ها</h1>
        <p className="mt-2 text-sm text-slate-500">مشاهده سفارش‌ها و تغییر وضعیت سفارش</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {statuses.map((item) => <Button key={item.value} variant={status === item.value ? "default" : "outline"} onClick={() => setStatus(item.value)}>{item.label}</Button>)}
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-right text-sm">
            <thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">سفارش</th><th className="p-4">تاریخ</th><th className="p-4">مبلغ</th><th className="p-4">وضعیت</th><th className="p-4">تغییر وضعیت</th><th className="p-4">جزئیات</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => (
                <tr key={order._id}>
                  <td className="p-4 font-bold">#{order._id.slice(-8)}</td>
                  <td className="p-4">{formatPersianDate(order.createdAt)}</td>
                  <td className="p-4">{formatPrice(order.totalPrice)}</td>
                  <td className="p-4"><Badge>{translateOrderStatus(order.status)}</Badge></td>
                  <td className="p-4">
                    <select value={order.status} onChange={(e) => updateStatus.mutate({ orderId: order._id, status: e.target.value })} className="h-10 rounded-xl border border-slate-200 px-2 text-sm">
                      {statuses.filter((item) => item.value !== "all").map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                  </td>
                  <td className="p-4"><Link href={`/admin/orders/${order._id}`}><Button variant="outline">مشاهده</Button></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
}
