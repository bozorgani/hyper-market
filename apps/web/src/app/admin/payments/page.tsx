"use client";

import { useCallback, useMemo, useState } from "react";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { PaymentDetailModal } from "@/components/admin/payment-detail-modal";
import { PaymentRow } from "@/components/admin/payment-row";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminOrders } from "@/features/admin/admin-api";

const PAGE_SIZE = 10;

type PaymentMeta = {
  status?: string;
  transactionId?: string | null;
};

export default function AdminPaymentsPage() {
  const orders = useAdminOrders();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [paymentMetaMap, setPaymentMetaMap] = useState<Record<string, PaymentMeta>>({});

  const handlePaymentLoaded = useCallback((payload: { orderId: string; status?: string; transactionId?: string | null }) => {
    setPaymentMetaMap((current) => {
      const prev = current[payload.orderId];
      if (prev?.status === payload.status && prev?.transactionId === payload.transactionId) return current;
      return { ...current, [payload.orderId]: { status: payload.status, transactionId: payload.transactionId } };
    });
  }, []);

  const filteredOrders = useMemo(() => {
    return (orders.data ?? []).filter((order) => {
      const meta = paymentMetaMap[order._id];
      const queryValue = query.trim().toLowerCase();
      const matchesQuery = queryValue
        ? [order._id, meta?.transactionId ?? ""].some((value) => value.toLowerCase().includes(queryValue))
        : true;
      const matchesStatus = statusFilter === "all" ? true : (meta?.status ?? "unknown") === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [orders.data, paymentMetaMap, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const paginatedOrders = filteredOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const errorMessage = orders.error instanceof Error ? orders.error.message : "دریافت سفارش‌ها برای پایش پرداخت ناموفق بود.";

  return (
    <main className="space-y-5 text-right">
      <PageHeader title="پایش پرداخت‌ها" description="فیلتر، جستجو و مشاهده جزئیات پرداخت سفارش‌های ثبت‌شده از این بخش انجام می‌شود." />

      <Card className="p-4">
        <div className="grid gap-3 xl:grid-cols-[1fr_0.8fr_auto]">
          <Input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="جستجو بر اساس شناسه سفارش یا تراکنش..." />
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm">
            <option value="all">همه وضعیت‌های پرداخت</option>
            <option value="pending">در انتظار</option>
            <option value="paid">موفق</option>
            <option value="failed">ناموفق</option>
            <option value="cancelled">لغوشده</option>
            <option value="unknown">نامشخص</option>
          </select>
          <Button type="button" variant="outline" onClick={() => { setQuery(""); setStatusFilter("all"); setPage(1); }}>پاک‌کردن فیلترها</Button>
        </div>
      </Card>

      {orders.isError ? <ErrorState title="بارگذاری پرداخت‌ها انجام نشد" description={errorMessage} actions={<Button type="button" variant="outline" onClick={() => orders.refetch()}>تلاش مجدد</Button>} /> : null}

      {!orders.isError ? (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 text-sm text-slate-500">
            <p>فهرست پرداخت‌ها</p>
            <p>{filteredOrders.length} مورد</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-right text-sm">
              <thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">سفارش</th><th className="p-4">مبلغ</th><th className="p-4">وضعیت پرداخت</th><th className="p-4">تراکنش</th><th className="p-4">عملیات</th></tr></thead>
              <tbody>
                {orders.isLoading ? Array.from({ length: 5 }).map((_, index) => <tr key={index}><td className="p-4" colSpan={5}><Skeleton className="h-10 w-full" /></td></tr>) : null}
                {!orders.isLoading && paginatedOrders.map((order) => (
                  <PaymentRow
                    key={order._id}
                    order={order}
                    onOpenDetail={setSelectedOrderId}
                    onPaymentLoaded={handlePaymentLoaded}
                  />
                ))}
              </tbody>
            </table>
          </div>
          {!orders.isLoading && filteredOrders.length === 0 ? (
            <div className="p-4">
              <EmptyState title="پرداختی یافت نشد" description="فیلتر وضعیت یا عبارت جستجو را تغییر دهید تا نتیجه‌ای نمایش داده شود." actions={<Button type="button" onClick={() => { setQuery(""); setStatusFilter("all"); setPage(1); }}>بازنشانی فیلترها</Button>} />
            </div>
          ) : null}
          {!orders.isLoading && filteredOrders.length > 0 ? <AdminPagination page={page} totalPages={totalPages} totalItems={filteredOrders.length} pageSize={PAGE_SIZE} onPageChange={setPage} /> : null}
        </Card>
      ) : null}

      <PaymentDetailModal orderId={selectedOrderId} open={Boolean(selectedOrderId)} onClose={() => setSelectedOrderId(null)} />
    </main>
  );
}
