"use client";

import { motion } from "framer-motion";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { Card } from "@/components/ui/card";
import { formatPrice, translateOrderStatus } from "@/lib/utils";
import { useAdminOrders, useAdminProducts, useAdminUsers } from "@/features/admin/admin-api";

export default function AdminDashboardPage() {
  const products = useAdminProducts();
  const orders = useAdminOrders();
  const users = useAdminUsers();
  const paidOrders = (orders.data ?? []).filter((order) => order.status === "paid");
  const revenue = paidOrders.reduce((sum, order) => sum + order.totalPrice, 0);
  const chartBars = [35, 50, 42, 70, 58, 82, 64];

  return (
    <main className="space-y-5 text-right">
      <div>
        <h1 className="text-2xl font-black">داشبورد مدیریت</h1>
        <p className="mt-2 text-sm text-slate-500">نمای کلی فروش، سفارش‌ها و موجودی فروشگاه</p>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard title="کل سفارش‌ها" value={orders.data?.length ?? 0} />
        <AdminStatCard title="درآمد کل" value={formatPrice(revenue)} />
        <AdminStatCard title="کل محصولات" value={products.data?.total ?? 0} />
        <AdminStatCard title="کل کاربران" value={users.data?.length ?? 0} hint={users.isError ? "API کاربران در بک‌اند فعال نیست" : undefined} />
      </section>
      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="p-5">
          <h2 className="font-black">نمودار درآمد هفتگی</h2>
          <div className="mt-6 flex h-48 items-end gap-3 border-b border-slate-100 pb-3">
            {chartBars.map((height, index) => (
              <motion.div
                key={index}
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                className="flex-1 rounded-t-2xl bg-rose-500"
              />
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="font-black">آخرین سفارش‌ها</h2>
          <div className="mt-4 space-y-3">
            {(orders.data ?? []).slice(0, 5).map((order) => (
              <div key={order._id} className="rounded-2xl bg-slate-50 p-3 text-sm">
                <p className="font-bold">#{order._id.slice(-8)}</p>
                <p className="mt-1 text-slate-500">{formatPrice(order.totalPrice)} · {translateOrderStatus(order.status)}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </main>
  );
}
