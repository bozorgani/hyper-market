"use client";

import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatNumber, formatPersianDate, formatPrice, translateOrderStatus } from "@/lib/utils";
import { useAdminOrders } from "@/features/admin/admin-api";

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orders = useAdminOrders();
  const order = (orders.data ?? []).find((item) => item._id === params.id);

  if (orders.isLoading) return <p className="text-right text-slate-500">در حال بارگذاری...</p>;
  if (!order) return <p className="text-right text-red-500">سفارش پیدا نشد.</p>;

  return (
    <main className="space-y-5 text-right">
      <h1 className="text-2xl font-black">جزئیات سفارش #{order._id.slice(-8)}</h1>
      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div><p className="text-sm text-slate-500">وضعیت</p><Badge className="mt-2">{translateOrderStatus(order.status)}</Badge></div>
          <div><p className="text-sm text-slate-500">تاریخ</p><p className="mt-2 font-bold">{formatPersianDate(order.createdAt)}</p></div>
          <div><p className="text-sm text-slate-500">مبلغ</p><p className="mt-2 font-bold">{formatPrice(order.totalPrice)}</p></div>
        </div>
      </Card>
      <Card className="overflow-hidden">
        <table className="w-full text-right text-sm"><thead className="bg-slate-50"><tr><th className="p-4">محصول</th><th className="p-4">تعداد</th><th className="p-4">قیمت خرید</th></tr></thead><tbody className="divide-y divide-slate-100">
          {order.items.map((item) => <tr key={item.productId}><td className="p-4 ltr text-left">{item.productId}</td><td className="p-4">{formatNumber(item.quantity)}</td><td className="p-4">{formatPrice(item.priceAtPurchase)}</td></tr>)}
        </tbody></table>
      </Card>
    </main>
  );
}
