"use client";

import { Suspense, lazy, useState, type FormEvent } from "react";
import { MapPin, Plus, Star, Trash2, Edit3, Navigation } from "lucide-react";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { IRAN_PROVINCES } from "@/data/iran-locations";
import {
  useCreateAddress,
  useDeleteAddress,
  useMyAddresses,
  useSetDefaultAddress,
  useUpdateAddress,
  type AddressInput,
} from "@/hooks/use-addresses";
import type { Address } from "@/types/domain";

const MapPicker = lazy(() =>
  import("@/components/ui/map-picker").then((m) => ({ default: m.MapPicker }))
);

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

function getAddressErrors(address: AddressInput) {
  const errors: Record<string, string> = {};
  if (address.recipientName.trim().length > 0 && address.recipientName.trim().length < 2) {
    errors.recipientName = "نام تحویل‌گیرنده حداقل ۲ کاراکتر باشد.";
  }
  if (address.phoneNumber.trim().length > 0 && !/^09\d{9}$/.test(address.phoneNumber.trim())) {
    errors.phoneNumber = "شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد.";
  }
  if (address.addressLine.trim().length > 0 && address.addressLine.trim().length < 10) {
    errors.addressLine = "آدرس باید حداقل ۱۰ کاراکتر باشد.";
  }
  if (address.postalCode?.trim() && !/^\d{10}$/.test(address.postalCode.trim())) {
    errors.postalCode = "کد پستی باید دقیقاً ۱۰ رقم باشد.";
  }
  return errors;
}

function isAddressValid(address: AddressInput) {
  return (
    address.recipientName.trim().length >= 2 &&
    /^09\d{9}$/.test(address.phoneNumber.trim()) &&
    address.province.trim().length >= 2 &&
    address.city.trim().length >= 2 &&
    address.addressLine.trim().length >= 10
  );
}

export function ProfileAddressesPageClient() {
  const addresses = useMyAddresses();
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const deleteAddress = useDeleteAddress();
  const setDefaultAddress = useSetDefaultAddress();
  const { showToast } = useToast();
  const [form, setForm] = useState<AddressInput>(emptyAddress);
  const [editing, setEditing] = useState<Address | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Address | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [mapLocation, setMapLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [addressFromMap, setAddressFromMap] = useState(false);

  const isSubmitting = createAddress.isPending || updateAddress.isPending;
  const fieldErrors = getAddressErrors(form);
  const formValid = isAddressValid(form);

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
    setMapLocation(null);
    setAddressFromMap(false);
  }

  function handleMapLocationSelect(result: { lat: number; lng: number; address: string; province: string; city: string }) {
    setMapLocation({ lat: result.lat, lng: result.lng });
    setForm((prev) => ({
      ...prev,
      addressLine: result.address.length > 8 ? result.address : prev.addressLine,
      province: result.province || prev.province,
      city: result.city || prev.city,
    }));
    setAddressFromMap(true);
    showToast({ type: "success", title: "آدرس از نقشه انتخاب شد" });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!formValid) {
      showToast({ type: "error", title: "لطفاً تمام فیلدهای الزامی را پر کنید" });
      return;
    }
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
      <div className="mx-auto max-w-4xl px-4 py-8 text-right">
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
            {/* Map Button */}
            <div className="md:col-span-2">
              <button
                type="button"
                onClick={() => setShowMap(true)}
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-500 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50"
              >
                <Navigation className="h-4 w-4" />
                انتخاب از روی نقشه
              </button>
            </div>

            <Input value={form.label ?? ""} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="عنوان آدرس مثل خانه یا محل کار" disabled={isSubmitting} />
            
            <div>
              <Input value={form.recipientName} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} placeholder="نام تحویل‌گیرنده" required disabled={isSubmitting} />
              {fieldErrors.recipientName && <p className="mt-1 text-[11px] leading-5 text-rose-500">{fieldErrors.recipientName}</p>}
            </div>
            
            <div>
              <Input
                value={form.phoneNumber}
                onChange={(e) => setForm({ ...form, phoneNumber: e.target.value.replace(/\D/g, "").slice(0, 11) })}
                placeholder="شماره موبایل مثل 09123456789"
                inputMode="numeric"
                maxLength={11}
                required
                disabled={isSubmitting}
              />
              {fieldErrors.phoneNumber && <p className="mt-1 text-[11px] leading-5 text-rose-500">{fieldErrors.phoneNumber}</p>}
            </div>

            {/* Province Select — locked when from map */}
            <div>
              {addressFromMap ? (
                <div className="flex h-12 items-center rounded-xl border border-emerald-200 bg-emerald-50/50 px-3 text-sm font-semibold text-emerald-700">
                  <MapPin className="ml-2 h-4 w-4" />
                  {form.province || "ثبت شده از نقشه"}
                </div>
              ) : (
                <select
                  value={form.province}
                  onChange={(e) => setForm({ ...form, province: e.target.value, city: "" })}
                  disabled={isSubmitting}
                  required
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-right text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-100"
                >
                  <option value="">انتخاب استان</option>
                  {IRAN_PROVINCES.map((item) => (
                    <option key={item.province} value={item.province}>{item.province}</option>
                  ))}
                </select>
              )}
            </div>

            {/* City Select — locked when from map */}
            <div>
              {addressFromMap ? (
                <div className="flex h-12 items-center rounded-xl border border-emerald-200 bg-emerald-50/50 px-3 text-sm font-semibold text-emerald-700">
                  <MapPin className="ml-2 h-4 w-4" />
                  {form.city || "ثبت شده از نقشه"}
                </div>
              ) : (
                <select
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  disabled={isSubmitting || !form.province}
                  required
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-right text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-100"
                >
                  <option value="">انتخاب شهر</option>
                  {IRAN_PROVINCES.find((item) => item.province === form.province)?.cities.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="md:col-span-2">
              <div>
                <textarea
                  value={form.addressLine}
                  onChange={(e) => setForm({ ...form, addressLine: e.target.value })}
                  placeholder="نشانی کامل"
                  required
                  disabled={isSubmitting}
                  className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-right text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-100"
                />
                {fieldErrors.addressLine && <p className="mt-1 text-[11px] leading-5 text-rose-500">{fieldErrors.addressLine}</p>}
              </div>
            </div>

            <Input
              value={form.plate ?? ""}
              onChange={(e) => setForm({ ...form, plate: e.target.value })}
              placeholder="پلاک"
              disabled={isSubmitting}
            />
            <Input
              value={form.unit ?? ""}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="واحد"
              disabled={isSubmitting}
            />

            <div>
              <Input
                value={form.postalCode ?? ""}
                onChange={(e) => setForm({ ...form, postalCode: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                placeholder="کد پستی ۱۰ رقمی، اختیاری"
                inputMode="numeric"
                maxLength={10}
                disabled={isSubmitting}
              />
              {fieldErrors.postalCode && <p className="mt-1 text-[11px] leading-5 text-rose-500">{fieldErrors.postalCode}</p>}
            </div>

            <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <input type="checkbox" checked={Boolean(form.isDefault)} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
              آدرس پیش‌فرض باشد
            </label>

            <div className="flex gap-2 md:col-span-2">
              <Button type="submit" disabled={isSubmitting || !formValid}>
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

        {/* Map Modal */}
        {showMap && (
          <Suspense
            fallback={
              <div className="fixed inset-0 z-[200] bg-white flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-[3px] border-rose-200 border-t-rose-600 rounded-full animate-spin" />
                  <p className="text-sm text-slate-500">در حال بارگذاری نقشه...</p>
                </div>
              </div>
            }
          >
            <MapPicker
              onLocationSelect={handleMapLocationSelect}
              onClose={() => setShowMap(false)}
              initialLat={mapLocation?.lat}
              initialLng={mapLocation?.lng}
            />
          </Suspense>
        )}
      </div>
    </ProtectedRoute>
  );
}
