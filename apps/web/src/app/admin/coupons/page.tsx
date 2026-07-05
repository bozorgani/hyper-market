"use client";

import { FormEvent, useState } from "react";
import { Gift, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  type CouponFormInput,
  useCreateCoupon,
  useDeleteCoupon,
  useAdminCoupons,
  useCouponAnalytics,
  useUpdateCoupon,
} from "@/features/admin/admin-api";
import { formatNumber, formatPrice } from "@/lib/utils";
import type { Coupon } from "@/types/domain";

const PAGE_SIZE = 10;
const emptyForm: CouponFormInput = {
  code: "",
  percent: 10,
  active: true,
  minSubtotal: 0,
  maxDiscountAmount: null,
  startsAt: null,
  endsAt: null,
  usageLimit: null,
  perUserLimit: null,
};

export default function AdminCouponsPage() {
  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [form, setForm] = useState<CouponFormInput>(emptyForm);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const coupons = useAdminCoupons(page, activeFilter === "all" ? undefined : activeFilter === "active", PAGE_SIZE);
  const analytics = useCouponAnalytics();
  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();
  const deleteCoupon = useDeleteCoupon();
  const { showToast } = useToast();

  const totalItems = coupons.data?.total ?? 0;
  const totalPages = coupons.data?.meta?.totalPages ?? Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const isSubmitting = createCoupon.isPending || updateCoupon.isPending;

  function startEdit(coupon: Coupon) {
    setEditing(coupon);
    setForm({
      code: coupon.code,
      percent: coupon.percent,
      active: coupon.active,
      minSubtotal: coupon.minSubtotal ?? 0,
      maxDiscountAmount: coupon.maxDiscountAmount ?? null,
      startsAt: coupon.startsAt ? coupon.startsAt.slice(0, 10) : null,
      endsAt: coupon.endsAt ? coupon.endsAt.slice(0, 10) : null,
      usageLimit: coupon.usageLimit ?? null,
      perUserLimit: coupon.perUserLimit ?? null,
    });
  }

  function resetForm() {
    setEditing(null);
    setForm(emptyForm);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const payload = normalizePayload(form);
      if (editing) {
        await updateCoupon.mutateAsync({ id: editing._id, input: payload });
        showToast({ type: "success", title: "کوپن ویرایش شد" });
      } else {
        await createCoupon.mutateAsync(payload);
        showToast({ type: "success", title: "کوپن ساخته شد" });
      }
      resetForm();
    } catch (error) {
      showToast({ type: "error", title: "ذخیره کوپن ناموفق بود", description: error instanceof Error ? error.message : undefined });
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteCoupon.mutateAsync(deleteTarget._id);
      showToast({ type: "success", title: "کوپن حذف شد" });
      setDeleteTarget(null);
    } catch (error) {
      showToast({ type: "error", title: "حذف کوپن ناموفق بود", description: error instanceof Error ? error.message : undefined });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">مدیریت کوپن‌ها</h1>
          <p className="mt-1 text-sm text-slate-500">ساخت، ویرایش، محدودیت استفاده و تحلیل کوپن‌های تخفیف</p>
        </div>
        <Button type="button" variant="outline" onClick={() => coupons.refetch()}>
          <RefreshCw className="h-4 w-4" /> تازه‌سازی
        </Button>
      </div>

      <section className="grid gap-3 sm:grid-cols-4">
        <Stat title="کل کوپن‌ها" value={analytics.data?.totalCoupons ?? 0} />
        <Stat title="فعال" value={analytics.data?.activeCoupons ?? 0} />
        <Stat title="دفعات استفاده" value={analytics.data?.totalUsages ?? 0} />
        <Stat title="جمع تخفیف" value={formatPrice(analytics.data?.totalDiscountAmount ?? 0)} />
      </section>

      <Card className="p-5">
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-4">
          <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="کد مثل WELCOME10" required />
          <Input value={form.percent} onChange={(e) => setForm({ ...form, percent: Number(e.target.value) })} type="number" min={0} max={100} placeholder="درصد" required />
          <Input value={form.minSubtotal ?? ""} onChange={(e) => setForm({ ...form, minSubtotal: e.target.value ? Number(e.target.value) : 0 })} type="number" placeholder="حداقل سبد" />
          <Input value={form.maxDiscountAmount ?? ""} onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value ? Number(e.target.value) : null })} type="number" placeholder="سقف تخفیف" />
          <Input value={form.usageLimit ?? ""} onChange={(e) => setForm({ ...form, usageLimit: e.target.value ? Number(e.target.value) : null })} type="number" placeholder="سقف استفاده کل" />
          <Input value={form.perUserLimit ?? ""} onChange={(e) => setForm({ ...form, perUserLimit: e.target.value ? Number(e.target.value) : null })} type="number" placeholder="سقف هر کاربر" />
          <Input value={form.startsAt ?? ""} onChange={(e) => setForm({ ...form, startsAt: e.target.value || null })} type="date" placeholder="شروع" />
          <Input value={form.endsAt ?? ""} onChange={(e) => setForm({ ...form, endsAt: e.target.value || null })} type="date" placeholder="پایان" />
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <input type="checkbox" checked={form.active !== false} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> فعال
          </label>
          <div className="flex gap-2 md:col-span-3">
            <Button type="submit" disabled={isSubmitting}>
              <Plus className="h-4 w-4" /> {editing ? "ذخیره تغییرات" : "افزودن کوپن"}
            </Button>
            {editing ? <Button type="button" variant="outline" onClick={resetForm}>لغو ویرایش</Button> : null}
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div className="flex items-center gap-2"><Gift className="h-4 w-4 text-slate-400" /> <span className="text-sm font-semibold text-slate-700">فهرست کوپن‌ها</span></div>
          <select value={activeFilter} onChange={(e) => { setActiveFilter(e.target.value as typeof activeFilter); setPage(1); }} className="h-10 rounded-xl border border-slate-200 px-3 text-sm">
            <option value="all">همه</option>
            <option value="active">فعال</option>
            <option value="inactive">غیرفعال</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-right text-sm">
            <thead><tr className="bg-slate-50 text-xs text-slate-400"><th className="px-5 py-3">کد</th><th>درصد</th><th>حداقل</th><th>سقف</th><th>استفاده</th><th>وضعیت</th><th>عملیات</th></tr></thead>
            <tbody className="divide-y divide-slate-50">
              {coupons.isLoading ? Array.from({ length: 4 }).map((_, i) => <tr key={i}><td className="p-5" colSpan={7}><SkeletonRow /></td></tr>) : null}
              {(coupons.data?.items ?? []).map((coupon) => (
                <tr key={coupon._id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3.5 font-mono font-bold text-slate-800">{coupon.code}</td>
                  <td>{formatNumber(coupon.percent)}٪</td>
                  <td>{formatPrice(coupon.minSubtotal ?? 0)}</td>
                  <td>{coupon.maxDiscountAmount ? formatPrice(coupon.maxDiscountAmount) : "—"}</td>
                  <td>{formatNumber(coupon.usedCount ?? 0)} / {coupon.usageLimit ? formatNumber(coupon.usageLimit) : "∞"}</td>
                  <td><span className={coupon.active ? "text-emerald-600" : "text-slate-400"}>{coupon.active ? "فعال" : "غیرفعال"}</span></td>
                  <td className="space-x-2 space-x-reverse">
                    <Button type="button" variant="outline" onClick={() => startEdit(coupon)}><Pencil className="h-4 w-4" /> ویرایش</Button>
                    <Button type="button" variant="destructive" onClick={() => setDeleteTarget(coupon)}><Trash2 className="h-4 w-4" /> حذف</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalItems > 0 ? <AdminPagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={PAGE_SIZE} onPageChange={setPage} /> : null}
      </Card>

      <ConfirmDialog open={Boolean(deleteTarget)} title="حذف کوپن" description={`کوپن ${deleteTarget?.code ?? ""} حذف شود؟`} confirmText="حذف کوپن" destructive loading={deleteCoupon.isPending} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}

function normalizePayload(input: CouponFormInput): CouponFormInput {
  return {
    ...input,
    code: input.code.trim().toUpperCase(),
    minSubtotal: Number(input.minSubtotal ?? 0),
    maxDiscountAmount: input.maxDiscountAmount || null,
    usageLimit: input.usageLimit || null,
    perUserLimit: input.perUserLimit || null,
    startsAt: input.startsAt || null,
    endsAt: input.endsAt || null,
  };
}

function Stat({ title, value }: { title: string; value: string | number }) {
  return <Card className="p-4"><p className="text-xs text-slate-400">{title}</p><p className="mt-2 text-xl font-black text-slate-900">{typeof value === 'number' ? formatNumber(value) : value}</p></Card>;
}

function SkeletonRow() {
  return <div className="h-10 animate-pulse rounded-xl bg-slate-100" />;
}
