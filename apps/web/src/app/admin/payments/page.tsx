"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, Eye, RefreshCw, CreditCard } from "lucide-react";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { PaymentDetailModal } from "@/components/admin/payment-detail-modal";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminOrders, useAdminPayments } from "@/features/admin/admin-api";
import { formatPrice } from "@/lib/utils";

const PAGE_SIZE = 10;

export default function AdminPaymentsPage() {
  const orders = useAdminOrders();
  const orderIds = useMemo(() => (orders.data ?? []).map((order) => order._id), [orders.data]);
  const payments = useAdminPayments(orderIds);
  const paymentMetaMap = useMemo(() => {
    const meta: Record<string, { status?: string; transactionId?: string | null }> = {};
    for (const payment of payments.data ?? []) {
      meta[payment.orderId] = { status: payment.status, transactionId: payment.transactionId ?? null };
    }
    return meta;
  }, [payments.data]);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    return (orders.data ?? []).filter((order) => {
      const meta = paymentMetaMap[order._id];
      const queryValue = query.trim().toLowerCase();
      const matchesQuery = queryValue ? [order._id, meta?.transactionId ?? ""].some((value) => value.toLowerCase().includes(queryValue)) : true;
      const matchesStatus = statusFilter === "all" ? true : (meta?.status ?? "unknown") === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [orders.data, paymentMetaMap, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const paginatedOrders = filteredOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const errorMessage = orders.error instanceof Error ? orders.error.message : "دریافت اطلاعات پرداخت ناموفق بود.";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-slate-900">پایش پرداخت‌ها</h1>
        <p className="mt-1 text-sm text-slate-500">فیلتر، جستجو و مشاهده جزئیات پرداخت سفارش‌ها</p>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_auto]">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="جستجو بر اساس شناسه سفارش یا کد پیگیری..." className="pr-10" />
          </div>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm">
            <option value="all">همه وضعیت‌ها</option>
            <option value="pending">در انتظار</option>
            <option value="paid">موفق</option>
            <option value="failed">ناموفق</option>
            <option value="cancelled">لغوشده</option>
            <option value="unknown">نامشخص</option>
          </select>
          <button onClick={() => { setQuery(""); setStatusFilter("all"); setPage(1); }} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" /> پاک‌کردن
          </button>
        </div>
      </div>

      {orders.isError ? (
        <ErrorState title="بارگذاری پرداخت‌ها انجام نشد" description={errorMessage} actions={<Button type="button" variant="outline" onClick={() => orders.refetch()}>تلاش مجدد</Button>} />
      ) : null}

      {!orders.isError && (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">فهرست پرداخت‌ها</span>
            </div>
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">{filteredOrders.length} مورد</span>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[920px] text-right text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-400">سفارش</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-400">مبلغ</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-400">وضعیت</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-400">کد پیگیری</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-400">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {orders.isLoading ? Array.from({ length: 5 }).map((_, index) => <tr key={index}><td className="p-5" colSpan={5}><Skeleton className="h-12 w-full rounded-xl" /></td></tr>) : null}
                {!orders.isLoading && paginatedOrders.map((order) => (
                  <motion.tr key={order._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="transition hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 font-bold text-slate-800">#{order._id.slice(-8)}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-700">{formatPrice(order.totalPrice)}</td>
                    <td className="px-5 py-3.5">
                      <PaymentStatusBadgeInline status={paymentMetaMap[order._id]?.status} />
                    </td>
                    <td className="px-5 py-3.5 ltr text-left font-mono text-xs text-slate-500">{paymentMetaMap[order._id]?.transactionId ?? "-"}</td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => setSelectedOrderId(order._id)} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200">
                        <Eye className="h-3 w-3" /> جزئیات
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-slate-50">
            {orders.isLoading ? Array.from({ length: 3 }).map((_, index) => <div key={index} className="p-4"><Skeleton className="h-20 w-full rounded-xl" /></div>) : null}
            {!orders.isLoading && paginatedOrders.map((order) => (
              <div key={order._id} className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">#{order._id.slice(-8)}</span>
                  <PaymentStatusBadgeInline status={paymentMetaMap[order._id]?.status} />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">{formatPrice(order.totalPrice)}</span>
                  <button onClick={() => setSelectedOrderId(order._id)} className="text-xs font-semibold text-emerald-600">جزئیات</button>
                </div>
              </div>
            ))}
          </div>

          {!orders.isLoading && filteredOrders.length === 0 ? (
            <div className="p-8"><EmptyState title="پرداختی یافت نشد" description="فیلترها را تغییر دهید." actions={<Button type="button" onClick={() => { setQuery(""); setStatusFilter("all"); setPage(1); }}>بازنشانی</Button>} /></div>
          ) : null}
          {!orders.isLoading && filteredOrders.length > 0 ? <AdminPagination page={page} totalPages={totalPages} totalItems={filteredOrders.length} pageSize={PAGE_SIZE} onPageChange={setPage} /> : null}
        </div>
      )}

      <PaymentDetailModal orderId={selectedOrderId} open={Boolean(selectedOrderId)} onClose={() => setSelectedOrderId(null)} />
    </div>
  );
}

function PaymentStatusBadgeInline({ status }: { status?: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700",
    paid: "bg-emerald-50 text-emerald-700",
    failed: "bg-red-50 text-red-600",
    cancelled: "bg-slate-100 text-slate-500",
  };
  const labels: Record<string, string> = { pending: "در انتظار", paid: "موفق", failed: "ناموفق", cancelled: "لغوشده" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${styles[status ?? ""] ?? "bg-slate-100 text-slate-500"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === "paid" ? "bg-emerald-500" : status === "failed" ? "bg-red-500" : status === "pending" ? "bg-amber-500" : "bg-slate-400"}`} />
      {labels[status ?? ""] ?? "نامشخص"}
    </span>
  );
}