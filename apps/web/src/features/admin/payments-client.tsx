"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Eye, RefreshCw, CreditCard } from "lucide-react";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PaymentDetailModal } from "@/components/admin/payment-detail-modal";
import { useAdminPayments } from "@/features/admin/admin-api";
import { formatPrice } from "@/lib/utils";

const PAGE_SIZE = 10;

export function AdminPaymentsClient() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const payments = useAdminPayments(
    page,
    statusFilter === "all" ? undefined : statusFilter,
    query.trim() || undefined,
    PAGE_SIZE,
  );
  const rows = payments.data?.items ?? [];
  const totalItems = payments.data?.total ?? 0;
  const totalPages = payments.data?.meta?.totalPages ?? Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const errorMessage = payments.error instanceof Error ? payments.error.message : "دریافت اطلاعات پرداخت ناموفق بود.";

  function resetFilters() {
    setQuery("");
    setStatusFilter("all");
    setPage(1);
  }

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
            <Input
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(1); }}
              placeholder="جستجو بر اساس شناسه سفارش یا کد پیگیری..."
              className="pr-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="all">همه وضعیت‌ها</option>
            <option value="pending">در انتظار</option>
            <option value="paid">موفق</option>
            <option value="failed">ناموفق</option>
            <option value="cancelled">لغوشده</option>
          </select>
          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" /> پاک‌کردن
          </button>
        </div>
      </div>

      {payments.isError ? (
        <ErrorState
          title="بارگذاری پرداخت‌ها انجام نشد"
          description={errorMessage}
          actions={<Button type="button" variant="outline" onClick={() => payments.refetch()}>تلاش مجدد</Button>}
        />
      ) : null}

      {!payments.isError && (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">فهرست پرداخت‌ها</span>
            </div>
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">{totalItems} مورد</span>
          </div>

          <div className="hidden overflow-x-auto md:block">
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
                {payments.isLoading ? Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index}><td className="p-5" colSpan={5}><Skeleton className="h-12 w-full rounded-xl" /></td></tr>
                )) : null}
                {!payments.isLoading && rows.map((payment) => {
                  const orderId = payment.order?._id ?? payment.orderId;
                  return (
                    <motion.tr key={payment._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="transition hover:bg-slate-50/50">
                      <td className="px-5 py-3.5 font-bold text-slate-800">#{orderId.slice(-8)}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-700">{formatPrice(payment.order?.totalPrice ?? payment.amount)}</td>
                      <td className="px-5 py-3.5"><PaymentStatusBadgeInline status={payment.status} /></td>
                      <td className="px-5 py-3.5 ltr text-left font-mono text-xs text-slate-500">{payment.transactionId ?? "-"}</td>
                      <td className="px-5 py-3.5">
                        <button type="button" onClick={() => setSelectedOrderId(orderId)} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200">
                          <Eye className="h-3 w-3" /> جزئیات
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-slate-50 md:hidden">
            {payments.isLoading ? Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="p-4"><Skeleton className="h-20 w-full rounded-xl" /></div>
            )) : null}
            {!payments.isLoading && rows.map((payment) => {
              const orderId = payment.order?._id ?? payment.orderId;
              return (
                <div key={payment._id} className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">#{orderId.slice(-8)}</span>
                    <PaymentStatusBadgeInline status={payment.status} />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">{formatPrice(payment.order?.totalPrice ?? payment.amount)}</span>
                    <button type="button" onClick={() => setSelectedOrderId(orderId)} className="text-xs font-semibold text-emerald-600">جزئیات</button>
                  </div>
                </div>
              );
            })}
          </div>

          {!payments.isLoading && rows.length === 0 ? (
            <div className="p-8"><EmptyState title="پرداختی یافت نشد" description="فیلترها را تغییر دهید." actions={<Button type="button" onClick={resetFilters}>بازنشانی</Button>} /></div>
          ) : null}
          {!payments.isLoading && rows.length > 0 ? (
            <AdminPagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={PAGE_SIZE} onPageChange={setPage} />
          ) : null}
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
      <span className={`h-1.5 w-1.5 rounded-full ${status === "paid" ? "bg-green-500" : status === "failed" ? "bg-red-500" : status === "pending" ? "bg-amber-500" : "bg-slate-400"}`} />
      {labels[status ?? ""] ?? "نامشخص"}
    </span>
  );
}
