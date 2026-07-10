"use client";

import { X } from "lucide-react";
import { PaymentStatusBadge } from "@/components/order/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useAdminPayment } from "@/features/admin/admin-api";
import { formatPrice, translatePaymentMethod } from "@/lib/utils";

function PaymentInfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={mono ? "ltr mt-2 break-all text-left font-mono text-sm text-slate-900" : "mt-2 font-semibold text-slate-900"}>{value}</p>
    </div>
  );
}

export function PaymentDetailModal({
  orderId,
  open,
  onClose,
}: {
  orderId?: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const payment = useAdminPayment(orderId ?? "");

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId="payment-detail-title"
      descriptionId="payment-detail-description"
      className="max-w-2xl"
    >
        <div className="flex items-start justify-between gap-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
            aria-label="بستن"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="flex-1">
            <h2 id="payment-detail-title" className="text-xl font-black text-slate-950">جزئیات پرداخت سفارش</h2>
            <p id="payment-detail-description" className="mt-2 text-sm leading-6 text-slate-500">اطلاعات پرداخت مرتبط با سفارش انتخاب‌شده در این پنجره نمایش داده می‌شود.</p>
          </div>
        </div>

        {payment.isLoading ? <p className="mt-6 text-sm text-slate-500">در حال بارگذاری جزئیات پرداخت...</p> : null}
        {!payment.isLoading && payment.isError ? <p className="mt-6 rounded-2xl bg-red-50 p-4 text-sm leading-7 text-red-700">اطلاعات پرداخت برای این سفارش در دسترس نیست.</p> : null}
        {!payment.isLoading && !payment.isError && payment.data ? (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div>
                <p className="text-sm text-slate-500">وضعیت پرداخت</p>
                <div className="mt-2"><PaymentStatusBadge status={payment.data.status} /></div>
              </div>
              <div className="text-left">
                <p className="text-sm text-slate-500">مبلغ</p>
                <p className="mt-2 text-lg font-black text-slate-950">{formatPrice(payment.data.amount)}</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <PaymentInfoRow label="شناسه پرداخت" value={payment.data._id} mono />
              <PaymentInfoRow label="شناسه سفارش" value={payment.data.orderId} mono />
              <PaymentInfoRow label="شناسه کاربر" value={payment.data.userId} mono />
              <PaymentInfoRow label="روش پرداخت" value={translatePaymentMethod(payment.data.method)} />
              <PaymentInfoRow label="کد پیگیری" value={payment.data.transactionId ?? "ثبت نشده"} mono />
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>بستن</Button>
        </div>
    </Dialog>
  );
}
