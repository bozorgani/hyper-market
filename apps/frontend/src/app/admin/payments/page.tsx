"use client";

import { Card } from "@/components/ui/card";
import { PaymentRow } from "@/components/admin/payment-row";
import { useAdminOrders } from "@/features/admin/admin-api";

export default function AdminPaymentsPage() {
  const orders = useAdminOrders();

  return (
    <main className="space-y-5 text-right">
      <div>
        <h1 className="text-2xl font-black">پایش پرداخت‌ها</h1>
        <p className="mt-2 text-sm text-slate-500">وضعیت پرداخت‌ها بر اساس سفارش‌های ثبت‌شده نمایش داده می‌شود.</p>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-right text-sm">
            <thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">سفارش</th><th className="p-4">مبلغ</th><th className="p-4">وضعیت پرداخت</th><th className="p-4">تراکنش</th><th className="p-4">لینک</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {(orders.data ?? []).map((order) => <PaymentRow key={order._id} order={order} />)}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
}
