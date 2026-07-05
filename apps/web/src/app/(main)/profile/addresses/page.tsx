"use client";

import { useState, type FormEvent } from "react";
import { MapPin, Plus, Star, Trash2, Edit3 } from "lucide-react";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  useCreateAddress,
  useDeleteAddress,
  useMyAddresses,
  useSetDefaultAddress,
  useUpdateAddress,
  type AddressInput,
} from "@/hooks/use-addresses";
import type { Address } from "@/types/domain";

const emptyAddress: AddressInput = {
  label: "",
  recipientName: "",
  phoneNumber: "",
  province: "",
  city: "",
  addressLine: "",
  plate: "",
  unit: "",
  postalCode: "",
  isDefault: false,
};

export default function AddressesPage() {
  const addresses = useMyAddresses();
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const deleteAddress = useDeleteAddress();
  const setDefaultAddress = useSetDefaultAddress();
  const { showToast } = useToast();
  const [form, setForm] = useState<AddressInput>(emptyAddress);
  const [editing, setEditing] = useState<Address | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Address | null>(null);

  const isSubmitting = createAddress.isPending || updateAddress.isPending;

  function startEdit(address: Address) {
    setEditing(address);
    setForm({
      label: address.label ?? "",
      recipientName: address.recipientName,
      phoneNumber: address.phoneNumber,
      province: address.province,
      city: address.city,
      addressLine: address.addressLine,
      plate: address.plate ?? "",
      unit: address.unit ?? "",
      postalCode: address.postalCode ?? "",
      isDefault: Boolean(address.isDefault),
    });
  }

  function resetForm() {
    setEditing(null);
    setForm(emptyAddress);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      if (editing) {
        await updateAddress.mutateAsync({ id: editing._id, input: form });
        showToast({ type: "success", title: "آدرس ویرایش شد" });
      } else {
        await createAddress.mutateAsync(form);
        showToast({ type: "success", title: "آدرس ذخیره شد" });
      }
      resetForm();
    } catch (error) {
      showToast({ type: "error", title: "ذخیره آدرس ناموفق بود", description: error instanceof Error ? error.message : undefined });
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteAddress.mutateAsync(deleteTarget._id);
      showToast({ type: "success", title: "آدرس حذف شد" });
      setDeleteTarget(null);
    } catch (error) {
      showToast({ type: "error", title: "حذف آدرس ناموفق بود", description: error instanceof Error ? error.message : undefined });
    }
  }

  async function makeDefault(address: Address) {
    try {
      await setDefaultAddress.mutateAsync(address._id);
      showToast({ type: "success", title: "آدرس پیش‌فرض تغییر کرد" });
    } catch (error) {
      showToast({ type: "error", title: "تغییر آدرس پیش‌فرض ناموفق بود", description: error instanceof Error ? error.message : undefined });
    }
  }

  return (
    <ProtectedRoute>
      <main className="mx-auto max-w-4xl px-4 py-8 text-right">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">آدرس‌های من</h1>
            <p className="mt-1 text-sm text-slate-500">ذخیره، ویرایش و انتخاب آدرس پیش‌فرض برای تسویه‌حساب</p>
          </div>
        </div>

        <Card className="mb-6 p-5">
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
            <Input value={form.label ?? ""} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="عنوان آدرس مثل خانه یا محل کار" />
            <Input value={form.recipientName} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} placeholder="نام تحویل‌گیرنده" required />
            <Input value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} placeholder="شماره موبایل" required />
            <Input value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} placeholder="استان" required />
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="شهر" required />
            <Input value={form.postalCode ?? ""} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} placeholder="کد پستی" />
            <Input value={form.plate ?? ""} onChange={(e) => setForm({ ...form, plate: e.target.value })} placeholder="پلاک" />
            <Input value={form.unit ?? ""} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="واحد" />
            <label className="md:col-span-2">
              <textarea value={form.addressLine} onChange={(e) => setForm({ ...form, addressLine: e.target.value })} placeholder="نشانی کامل" required className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-right text-sm outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100" />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <input type="checkbox" checked={Boolean(form.isDefault)} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
              آدرس پیش‌فرض باشد
            </label>
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit" disabled={isSubmitting}>
                <Plus className="h-4 w-4" />
                {editing ? "ذخیره تغییرات" : "افزودن آدرس"}
              </Button>
              {editing ? <Button type="button" variant="outline" onClick={resetForm}>لغو ویرایش</Button> : null}
            </div>
          </form>
        </Card>

        <div className="grid gap-3">
          {addresses.isLoading ? <p className="text-sm text-slate-500">در حال دریافت آدرس‌ها...</p> : null}
          {!addresses.isLoading && (addresses.data ?? []).length === 0 ? <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500">هنوز آدرسی ذخیره نکرده‌اید.</p> : null}
          {(addresses.data ?? []).map((address) => (
            <Card key={address._id} className="p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-black text-slate-900">{address.label || address.recipientName}</p>
                    {address.isDefault ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">پیش‌فرض</span> : null}
                  </div>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{address.province}، {address.city}، {address.addressLine}</p>
                  <p className="mt-1 text-xs text-slate-400">{address.recipientName} — {address.phoneNumber}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!address.isDefault ? <Button type="button" variant="outline" onClick={() => makeDefault(address)}><Star className="h-4 w-4" /> پیش‌فرض</Button> : null}
                  <Button type="button" variant="outline" onClick={() => startEdit(address)}><Edit3 className="h-4 w-4" /> ویرایش</Button>
                  <Button type="button" variant="destructive" onClick={() => setDeleteTarget(address)}><Trash2 className="h-4 w-4" /> حذف</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <ConfirmDialog open={Boolean(deleteTarget)} title="حذف آدرس" description="آیا از حذف این آدرس مطمئن هستید؟" confirmText="حذف آدرس" destructive loading={deleteAddress.isPending} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
      </main>
    </ProtectedRoute>
  );
}
