"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, Eye, RefreshCw, Package } from "lucide-react";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { OrderStatusBadge } from "@/components/admin/admin-status-badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useAdminOrders, useUpdateOrderStatus } from "@/features/admin/admin-api";
import { formatPersianDate, formatPrice, translateOrderStatus, cn } from "@/lib/utils";
import type { OrderStatus } from "@/types/domain";

const statuses: Array<{ value: OrderStatus | "all"; label: string; color: string }> = [
  { value: "all", label: "همه", color: "bg-slate-100 text-slate-600" },
  { value: "pending", label: "در انتظار", color: "bg-amber-50 text-amber-700" },
  { value: "paid", label: "پرداخت‌شده", color: "bg-emerald-50 text-emerald-700" },
  { value: "processing", label: "در حال پردازش", color: "bg-blue-50 text-blue-700" },
  { value: "shipped", label: "ارسال‌شده", color: "bg-violet-50 text-violet-700" },
  { value: "delivered", label: "تحویل‌شده", color: "bg-slate-100 text-slate-600" },
  { value: "cancelled", label: "لغوشده", color: "bg-red-50 text-red-600" },
];

const PAGE_SIZE = 10;

export default function AdminOrdersPage() {
  const orders = useAdminOrders();
  const updateStatus = useUpdateOrderStatus();
  const { showToast } = useToast();
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filteredOrders = useMemo(() => {
    const items = orders.data ?? [];
    return items.filter((order) => {
      const matchesStatus = status === "all" ? true : order.status === status;
      const matchesQuery = query.trim() ? order._id.toLowerCase().includes(query.trim().toLowerCase()) : true;
      return matchesStatus && matchesQuery;
    });
  }, [orders.data, query, status]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const paginatedOrders = filteredOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const errorMessage = orders.error instanceof Error ? orders.error.message : "دریافت سفارش‌ها ناموفق بود.";

  async function handleStatusChange(orderId: string, nextStatus: string) {
    try {
      await updateStatus.mutateAsync({ orderId, status: nextStatus });
      showToast({ type: "success", title: "وضعیت سفارش به‌روزرسانی شد", description: `وضعیت جدید: ${translateOrderStatus(nextStatus)}` });
    } catch (error) {
      showToast({ type: "error", title: "تغییر وضعیت سفارش ناموفق بود", description: error instanceof Error ? error.message : undefined });
    }
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900">مدیریت سفارش‌ها</h1>
        <p className="mt-1 text-sm text-slate-500">جستجو، فیلتر، پایش و تغییر وضعیت سفارش‌ها</p>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder="جستجو بر اساس شناسه سفارش..."
              className="pr-10"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setQuery(""); setStatus("all"); setPage(1); }}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              پاک‌کردن
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {statuses.map((item) => (
            <button
              key={item.value}
              onClick={() => { setStatus(item.value); setPage(1); }}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                status === item.value
                  ? "bg-slate-900 text-white shadow-md"
                  : "text-slate-500 hover:bg-slate-100",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error State */}
      {orders.isError ? (
        <ErrorState title="بارگذاری سفارش‌ها انجام نشد" description={errorMessage} actions={<Button type="button" variant="outline" onClick={() => orders.refetch()}>تلاش مجدد</Button>} />
      ) : null}

      {/* Orders Table */}
      {!orders.isError && (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          {/* Table Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">فهرست سفارش‌ها</span>
            </div>
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
              {filteredOrders.length} مورد
            </span>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[900px] text-right text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-400">سفارش</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-400">تاریخ</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-400">مبلغ</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-400">وضعیت</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-400">تغییر وضعیت</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-400">جزئیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {orders.isLoading ? Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index}><td className="p-5" colSpan={6}><Skeleton className="h-12 w-full rounded-xl" /></td></tr>
                )) : null}
                {!orders.isLoading && paginatedOrders.map((order) => (
                  <motion.tr
                    key={order._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="transition hover:bg-slate-50/50"
                  >
                    <td className="px-5 py-3.5">
                      <span className="font-bold text-slate-800">#{order._id.slice(-8)}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{formatPersianDate(order.createdAt)}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800">{formatPrice(order.totalPrice)}</td>
                    <td className="px-5 py-3.5"><OrderStatusBadge status={order.status} /></td>
                    <td className="px-5 py-3.5">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order._id, e.target.value)}
                        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 transition focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                      >
                        {statuses.filter((item) => item.value !== "all").map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                      </select>
                    </td>
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/orders/${order._id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200">
                        <Eye className="h-3.5 w-3.5" />
                        مشاهده
                      </Link>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-slate-50">
            {orders.isLoading ? Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="p-4"><Skeleton className="h-28 w-full rounded-xl" /></div>
            )) : null}
            {!orders.isLoading && paginatedOrders.map((order) => (
              <Link key={order._id} href={`/admin/orders/${order._id}`} className="block p-4 transition hover:bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">#{order._id.slice(-8)}</span>
                  <OrderStatusBadge status={order.status} />
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-slate-500">{formatPersianDate(order.createdAt)}</span>
                  <span className="font-bold text-slate-800">{formatPrice(order.totalPrice)}</span>
                </div>
              </Link>
            ))}
          </div>

          {!orders.isLoading && filteredOrders.length === 0 ? (
            <div className="p-8">
              <EmptyState title="سفارشی یافت نشد" description="فیلتر وضعیت یا عبارت جستجو را تغییر دهید." actions={<Button type="button" onClick={() => { setQuery(""); setStatus("all"); setPage(1); }}>بازنشانی فیلترها</Button>} />
            </div>
          ) : null}
          {!orders.isLoading && filteredOrders.length > 0 ? <AdminPagination page={page} totalPages={totalPages} totalItems={filteredOrders.length} pageSize={PAGE_SIZE} onPageChange={setPage} /> : null}
        </div>
      )}
    </div>
  );
}