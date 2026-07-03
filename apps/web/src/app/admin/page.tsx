"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import { ReceiptText, TrendingUp, Users, Boxes, ArrowUpRight, Clock, ShoppingCart, DollarSign } from "lucide-react";
import Link from "next/link";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { formatPrice } from "@/lib/utils";
import { useAdminOrders, useAdminProducts, useAdminUsers } from "@/features/admin/admin-api";
import { OrderStatusBadge } from "@/components/order/status-badge";

const persianDays = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

export default function AdminDashboardPage() {
  const products = useAdminProducts();
  const orders = useAdminOrders();
  const users = useAdminUsers();

  const { revenue, revenueByDay } = useMemo(() => {
    const ordersList = orders.data ?? [];
    const paidOrders = ordersList.filter((order) => order.status === "paid");
    const revenue = paidOrders.reduce((sum, order) => sum + order.totalPrice, 0);

    const DAYS = 7;
    const buckets = new Array<number>(DAYS).fill(0);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    for (const order of paidOrders) {
      if (!order.createdAt) continue;
      const orderDate = new Date(order.createdAt);
      if (Number.isNaN(orderDate.getTime())) continue;
      const orderDayStart = new Date(orderDate);
      orderDayStart.setHours(0, 0, 0, 0);
      const diffDays = Math.round((startOfToday.getTime() - orderDayStart.getTime()) / 86_400_000);
      if (diffDays >= 0 && diffDays < DAYS) {
        buckets[DAYS - 1 - diffDays] += order.totalPrice;
      }
    }
    const max = Math.max(0, ...buckets);
    return { revenue, revenueByDay: { values: buckets, max } };
  }, [orders.data]);

  const recentOrders = (orders.data ?? []).slice(0, 6);
  const today = new Date().getDay();
  const dayLabels = Array.from({ length: 7 }, (_, i) => {
    const dayIdx = (today - 6 + i + 7) % 7;
    return persianDays[dayIdx === 6 ? 0 : dayIdx + 1];
  });

  const activeProductsCount = useMemo(() => {
    const items = products.data?.items;
    if (!Array.isArray(items)) return 0;
    return items.filter((p: { isActive?: boolean }) => p.isActive).length;
  }, [products.data?.items]);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">داشبورد مدیریت</h1>
          <p className="mt-1 text-sm text-slate-500">نمای کلی فروش، سفارش‌ها و موجودی فروشگاه</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/orders"
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-200"
          >
            <ReceiptText className="h-4 w-4" />
            مدیریت سفارشات
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          title="کل سفارش‌ها"
          value={orders.data?.length ?? 0}
          icon={ShoppingCart}
          gradient="bg-emerald-500"
          delay={0}
          trend={{ value: 12.5, label: "نسبت هفته قبل" }}
        />
        <AdminStatCard
          title="درآمد کل"
          value={formatPrice(revenue)}
          icon={DollarSign}
          gradient="bg-blue-500"
          delay={0.08}
          trend={{ value: 8.3, label: "نسبت ماه قبل" }}
        />
        <AdminStatCard
          title="کل محصولات"
          value={products.data?.total ?? 0}
          icon={Boxes}
          gradient="bg-amber-500"
          delay={0.16}
          hint={products.data?.total ? `${activeProductsCount} فعال` : undefined}
        />
        <AdminStatCard
          title="کل کاربران"
          value={users.data?.length ?? 0}
          icon={Users}
          gradient="bg-violet-500"
          delay={0.24}
          hint={users.isError ? "API کاربران در بک‌اند فعال نیست" : undefined}
        />
      </section>

      {/* Charts + Recent Orders */}
      <section className="grid gap-4 xl:grid-cols-[1fr_380px]">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">نمودار درآمد هفتگی</h2>
              <p className="mt-1 text-xs text-slate-400">درآمد ۷ روز اخیر</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <TrendingUp className="h-3.5 w-3.5" />
              رشد مثبت
            </div>
          </div>

          <div className="mt-8 flex h-52 items-end gap-2 lg:gap-3">
            {revenueByDay.values.map((value, index) => {
              const heightPercent = revenueByDay.max > 0 ? (value / revenueByDay.max) * 100 : 0;
              return (
                <div key={index} className="flex flex-1 flex-col items-center gap-2">
                  {/* Tooltip */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 + index * 0.05 }}
                    className="text-[10px] font-semibold text-slate-400"
                  >
                    {value > 0 ? `${(value / 1000).toFixed(0)}k` : ""}
                  </motion.div>
                  {/* Bar */}
                  <div className="relative flex w-full flex-1 items-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(heightPercent, 3)}%` }}
                      transition={{ delay: 0.4 + index * 0.06, duration: 0.6, ease: "easeOut" }}
                      className="w-full rounded-xl bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-md shadow-emerald-100"
                      style={{ minHeight: "8px" }}
                    />
                  </div>
                  {/* Day label */}
                  <span className="text-[11px] font-medium text-slate-400">{dayLabels[index]}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="rounded-2xl border border-slate-200/80 bg-white shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">آخرین سفارش‌ها</h2>
              <p className="mt-0.5 text-xs text-slate-400">{recentOrders.length} سفارش اخیر</p>
            </div>
            <Link href="/admin/orders" className="text-xs font-semibold text-emerald-600 transition hover:text-emerald-700">
              مشاهده همه
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {recentOrders.length === 0 && (
              <div className="p-8 text-center">
                <ShoppingCart className="mx-auto h-10 w-10 text-slate-200" />
                <p className="mt-3 text-sm text-slate-400">هنوز سفارشی ثبت نشده</p>
              </div>
            )}
            {recentOrders.map((order, idx) => (
              <motion.div
                key={order._id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + idx * 0.05 }}
              >
                <Link
                  href={`/admin/orders/${order._id}`}
                  className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-slate-50/80"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                    <ReceiptText className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800">#{order._id.slice(-8)}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                      <Clock className="h-3 w-3" />
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString("fa-IR") : "-"}
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-800">{formatPrice(order.totalPrice)}</p>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Quick Action Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "ثبت محصول جدید", href: "/admin/products/new", icon: Boxes, color: "from-emerald-500 to-teal-600", shadow: "shadow-emerald-200" },
          { label: "بررسی سفارشات", href: "/admin/orders", icon: ReceiptText, color: "from-blue-500 to-indigo-600", shadow: "shadow-blue-200" },
          { label: "مدیریت کاربران", href: "/admin/users", icon: Users, color: "from-violet-500 to-purple-600", shadow: "shadow-violet-200" },
          { label: "مشاهده آنالیتیکس", href: "/admin/analytics", icon: TrendingUp, color: "from-amber-500 to-orange-600", shadow: "shadow-amber-200" },
        ].map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white transition-transform hover:-translate-y-0.5"
              style={{ boxShadow: `0 8px 24px -4px var(--tw-gradient-from)` }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${action.color}`} />
              <div className="absolute -left-4 -bottom-4 h-20 w-20 rounded-full bg-white/10 blur-xl" />
              <div className="relative">
                <Icon className="mb-3 h-6 w-6 opacity-90" />
                <p className="text-sm font-bold">{action.label}</p>
                <ArrowUpRight className="absolute left-0 top-0 h-5 w-5 opacity-0 transition group-hover:opacity-100 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
