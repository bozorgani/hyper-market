"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { OrderStatusBadge } from "@/components/admin/admin-status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useAdminOrders, useUpdateOrderStatus } from "@/features/admin/admin-api";
import { formatPersianDate, formatPrice, translateOrderStatus } from "@/lib/utils";
import type { OrderStatus } from "@/types/domain";

const statuses: Array<{ value: OrderStatus | "all"; label: string }> = [
  { value: "all", label: "همه" },
  { value: "pending", label: "در انتظار" },
  { value: "paid", label: "پرداخت‌شده" },
  { value: "processing", label: "در حال پردازش" },
  { value: "shipped", label: "ارسال‌شده" },
  { value: "delivered", label: "تحویل‌شده" },
  { value: "cancelled", label: "لغوشده" },
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
    <main className="space-y-5 text-right">
      <PageHeader title="مدیریت سفارش‌ها" description="جستجو، فیلتر، پایش سفارش‌ها و تغییر وضعیت آن‌ها از این بخش انجام می‌شود." />

      <Card className="p-4">
        <div className="grid gap-3 xl:grid-cols-[1fr_auto]">
          <Input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="جستجو بر اساس شناسه سفارش..." />
          <Button type="button" variant="outline" onClick={() => { setQuery(""); setStatus("all"); setPage(1); }}>پاک‌کردن فیلترها</Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {statuses.map((item) => (
            <Button key={item.value} type="button" variant={status === item.value ? "default" : "outline"} onClick={() => { setStatus(item.value); setPage(1); }}>
              {item.label}
            </Button>
          ))}
        </div>
      </Card>

      {orders.isError ? <ErrorState title="بارگذاری سفارش‌ها انجام نشد" description={errorMessage} actions={<Button type="button" variant="outline" onClick={() => orders.refetch()}>تلاش مجدد</Button>} /> : null}

      {!orders.isError ? (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 text-sm text-slate-500">
            <p>فهرست سفارش‌ها</p>
            <p>{filteredOrders.length} مورد</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-right text-sm">
              <thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">سفارش</th><th className="p-4">تاریخ</th><th className="p-4">مبلغ</th><th className="p-4">وضعیت</th><th className="p-4">تغییر وضعیت</th><th className="p-4">جزئیات</th></tr></thead>
              <tbody>
                {orders.isLoading ? Array.from({ length: 5 }).map((_, index) => <tr key={index}><td className="p-4" colSpan={6}><Skeleton className="h-10 w-full" /></td></tr>) : null}
                {!orders.isLoading && paginatedOrders.map((order) => (
                  <tr key={order._id} className="border-b border-slate-100 transition hover:bg-slate-50/80">
                    <td className="p-4 font-bold">#{order._id.slice(-8)}</td>
                    <td className="p-4">{formatPersianDate(order.createdAt)}</td>
                    <td className="p-4">{formatPrice(order.totalPrice)}</td>
                    <td className="p-4"><OrderStatusBadge status={order.status} /></td>
                    <td className="p-4">
                      <select value={order.status} onChange={(e) => handleStatusChange(order._id, e.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm">
                        {statuses.filter((item) => item.value !== "all").map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                      </select>
                    </td>
                    <td className="p-4"><Link href={`/admin/orders/${order._id}`}><Button type="button" variant="outline">مشاهده</Button></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!orders.isLoading && filteredOrders.length === 0 ? (
            <div className="p-4">
              <EmptyState title="سفارشی یافت نشد" description="فیلتر وضعیت یا عبارت جستجو را تغییر دهید." actions={<Button type="button" onClick={() => { setQuery(""); setStatus("all"); setPage(1); }}>بازنشانی فیلترها</Button>} />
            </div>
          ) : null}
          {!orders.isLoading && filteredOrders.length > 0 ? <AdminPagination page={page} totalPages={totalPages} totalItems={filteredOrders.length} pageSize={PAGE_SIZE} onPageChange={setPage} /> : null}
        </Card>
      ) : null}
    </main>
  );
}
