"use client";

import { Suspense, lazy } from "react";
import { MapPin, Navigation } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { JalaliDatePicker } from "@/components/jalali-date-picker";
import { cn } from "@/lib/utils";
import { IRAN_PROVINCES } from "@/data/iran-locations";
import type { Address, DeliveryAddress, DeliveryWindow } from "@/types/domain";
import type { ShippingMethod, ShippingQuote } from "@/hooks/use-shipping";

const MapPicker = lazy(() =>
  import("@/components/ui/map-picker").then((m) => ({ default: m.MapPicker }))
);

export const deliveryTimeSlots = [
  { value: "09:00-12:00", label: "۹ تا ۱۲", emoji: "☀️" },
  { value: "12:00-15:00", label: "۱۲ تا ۱۵", emoji: "🌤️" },
  { value: "15:00-18:00", label: "۱۵ تا ۱۸", emoji: "⛅" },
  { value: "18:00-21:00", label: "۱۸ تا ۲۱", emoji: "🌙" },
];

export function todayDateInputValue() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function getFieldErrors(address: DeliveryAddress, deliveryWindow: DeliveryWindow) {
  const errors: Record<string, string> = {};
  if (address.recipientName.trim().length > 0 && address.recipientName.trim().length < 2) {
    errors.recipientName = "نام تحویل‌گیرنده حداقل ۲ کاراکتر باشد.";
  }
  if (address.phoneNumber.trim().length > 0 && !/^09\d{9}$/.test(address.phoneNumber.trim())) {
    errors.phoneNumber = "شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد.";
  }
  if (address.province.trim().length > 0 && address.province.trim().length < 2) {
    errors.province = "استان را انتخاب کنید.";
  }
  if (address.city.trim().length > 0 && address.city.trim().length < 2) {
    errors.city = "شهر را انتخاب کنید.";
  }
  if (address.addressLine.trim().length > 0 && address.addressLine.trim().length < 10) {
    errors.addressLine = "آدرس باید حداقل ۱۰ کاراکتر باشد.";
  }
  if (address.postalCode?.trim() && !/^\d{10}$/.test(address.postalCode.trim())) {
    errors.postalCode = "کد پستی باید دقیقاً ۱۰ رقم باشد.";
  }
  if (!deliveryWindow.date) {
    errors.deliveryDate = "تاریخ تحویل را انتخاب کنید.";
  }
  if (!deliveryWindow.timeSlot) {
    errors.deliveryTime = "بازه زمانی را انتخاب کنید.";
  }
  return errors;
}

type DeliveryAddressSectionProps = {
  deliveryAddress: DeliveryAddress;
  setDeliveryAddress: (addr: DeliveryAddress) => void;
  deliveryWindow: DeliveryWindow;
  setDeliveryWindow: (w: DeliveryWindow) => void;
  shippingMethod: ShippingMethod;
  setShippingMethod: (m: ShippingMethod) => void;
  isSubmitting: boolean;
  savedAddresses: { data?: Address[] };
  fieldErrors: Record<string, string>;
  showMap: boolean;
  setShowMap: (v: boolean) => void;
  mapLocation: { lat: number; lng: number } | null;
  setMapLocation: (loc: { lat: number; lng: number } | null) => void;
  shippingQuote: {
    isLoading?: boolean;
    isError?: boolean;
    error?: Error | null;
    data?: ShippingQuote | null;
  };
  selectedAddressId?: string;
  addressFromMap: boolean;
  onApplySavedAddress: (addressId: string) => void;
  onMapLocationSelect: (result: { lat: number; lng: number; address: string; province: string; city: string }) => void;
};

export function DeliveryAddressSection({
  deliveryAddress,
  setDeliveryAddress,
  deliveryWindow,
  setDeliveryWindow,
  shippingMethod,
  setShippingMethod,
  isSubmitting,
  savedAddresses,
  fieldErrors,
  showMap,
  setShowMap,
  mapLocation,
  shippingQuote,
  selectedAddressId,
  addressFromMap,
  onApplySavedAddress,
  onMapLocationSelect,
}: DeliveryAddressSectionProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 text-rose-600" />
        <p className="text-lg font-black text-slate-900">آدرس تحویل</p>
      </div>

      <button
        type="button"
        onClick={() => setShowMap(true)}
        disabled={isSubmitting}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-500 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
      >
        <Navigation className="h-4 w-4" />
        انتخاب از روی نقشه
      </button>

      {(savedAddresses.data ?? []).length > 0 ? (
        <label className="mt-4 block space-y-2">
          <span className="text-sm font-semibold text-slate-600">انتخاب از آدرس‌های ذخیره‌شده</span>
          <select
            onChange={(event) => onApplySavedAddress(event.target.value)}
            disabled={isSubmitting}
            value={selectedAddressId ?? ""}
            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-right text-sm outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100 disabled:bg-slate-100"
          >
            <option value="" disabled>انتخاب آدرس</option>
            {(savedAddresses.data ?? []).map((address) => (
              <option key={address._id} value={address._id}>
                {address.isDefault ? "پیش‌فرض — " : ""}{address.label || address.recipientName}، {address.city}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <Input
            value={deliveryAddress.recipientName}
            onChange={(e) => setDeliveryAddress({ ...deliveryAddress, recipientName: e.target.value })}
            placeholder="نام تحویل‌گیرنده"
            disabled={isSubmitting}
          />
          {fieldErrors.recipientName && <p className="mt-1 text-[11px] leading-5 text-rose-500">{fieldErrors.recipientName}</p>}
        </div>
        <div>
          <Input
            value={deliveryAddress.phoneNumber}
            onChange={(e) => setDeliveryAddress({ ...deliveryAddress, phoneNumber: e.target.value.replace(/\D/g, "").slice(0, 11) })}
            placeholder="شماره موبایل مثل 09123456789"
            inputMode="numeric"
            maxLength={11}
            disabled={isSubmitting}
          />
          {fieldErrors.phoneNumber && <p className="mt-1 text-[11px] leading-5 text-rose-500">{fieldErrors.phoneNumber}</p>}
        </div>
        <div>
          {addressFromMap ? (
            <div className="flex h-12 items-center rounded-xl border border-emerald-200 bg-emerald-50/50 px-3 text-sm font-semibold text-emerald-700">
              <MapPin className="ml-2 h-4 w-4" />
              {deliveryAddress.province || "ثبت شده از نقشه"}
            </div>
          ) : (
            <select
              value={deliveryAddress.province}
              onChange={(e) => setDeliveryAddress({ ...deliveryAddress, province: e.target.value, city: "" })}
              disabled={isSubmitting}
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-right text-sm text-slate-900 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100 disabled:bg-slate-100"
            >
              <option value="">انتخاب استان</option>
              {IRAN_PROVINCES.map((item) => (
                <option key={item.province} value={item.province}>{item.province}</option>
              ))}
            </select>
          )}
          {fieldErrors.province && <p className="mt-1 text-[11px] leading-5 text-rose-500">{fieldErrors.province}</p>}
        </div>
        <div>
          {addressFromMap ? (
            <div className="flex h-12 items-center rounded-xl border border-emerald-200 bg-emerald-50/50 px-3 text-sm font-semibold text-emerald-700">
              <MapPin className="ml-2 h-4 w-4" />
              {deliveryAddress.city || "ثبت شده از نقشه"}
            </div>
          ) : (
            <select
              value={deliveryAddress.city}
              onChange={(e) => setDeliveryAddress({ ...deliveryAddress, city: e.target.value })}
              disabled={isSubmitting || !deliveryAddress.province}
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-right text-sm text-slate-900 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100 disabled:bg-slate-100"
            >
              <option value="">انتخاب شهر</option>
              {IRAN_PROVINCES.find((item) => item.province === deliveryAddress.province)?.cities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          )}
          {fieldErrors.city && <p className="mt-1 text-[11px] leading-5 text-rose-500">{fieldErrors.city}</p>}
        </div>
        <div className="md:col-span-2">
          <Input
            value={deliveryAddress.addressLine}
            onChange={(e) => setDeliveryAddress({ ...deliveryAddress, addressLine: e.target.value })}
            placeholder="آدرس کامل"
            disabled={isSubmitting}
          />
          {fieldErrors.addressLine && <p className="mt-1 text-[11px] leading-5 text-rose-500">{fieldErrors.addressLine}</p>}
        </div>
        <Input
          value={deliveryAddress.plate ?? ""}
          onChange={(e) => setDeliveryAddress({ ...deliveryAddress, plate: e.target.value })}
          placeholder="پلاک"
          disabled={isSubmitting}
        />
        <Input
          value={deliveryAddress.unit ?? ""}
          onChange={(e) => setDeliveryAddress({ ...deliveryAddress, unit: e.target.value })}
          placeholder="واحد"
          disabled={isSubmitting}
        />
        <div>
          <Input
            value={deliveryAddress.postalCode ?? ""}
            onChange={(e) => setDeliveryAddress({ ...deliveryAddress, postalCode: e.target.value.replace(/\D/g, "").slice(0, 10) })}
            placeholder="کد پستی ۱۰ رقمی، اختیاری"
            inputMode="numeric"
            maxLength={10}
            disabled={isSubmitting}
          />
          {fieldErrors.postalCode && <p className="mt-1 text-[11px] leading-5 text-rose-500">{fieldErrors.postalCode}</p>}
        </div>
        <div>
          <JalaliDatePicker
            value={deliveryWindow.date}
            min={todayDateInputValue()}
            onChange={(iso) => setDeliveryWindow({ ...deliveryWindow, date: iso })}
            disabled={isSubmitting}
          />
          {fieldErrors.deliveryDate && <p className="mt-1 text-[11px] leading-5 text-rose-500">{fieldErrors.deliveryDate}</p>}
        </div>
        <div>
          <select
            value={deliveryWindow.timeSlot}
            onChange={(e) => setDeliveryWindow({ ...deliveryWindow, timeSlot: e.target.value })}
            disabled={isSubmitting}
            className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-right text-sm outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100 disabled:bg-slate-100"
          >
            {deliveryTimeSlots.map((slot) => (
              <option key={slot.value} value={slot.value}>{slot.emoji} {slot.label}</option>
            ))}
          </select>
          {fieldErrors.deliveryTime && <p className="mt-1 text-[11px] leading-5 text-rose-500">{fieldErrors.deliveryTime}</p>}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => setShippingMethod("standard")}
          className={cn(
            "rounded-2xl border p-4 text-right transition focus-visible:ring-4 focus-visible:ring-rose-100 disabled:opacity-60",
            shippingMethod === "standard" ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-white hover:bg-slate-50",
          )}
        >
          <p className="font-bold text-slate-900">ارسال استاندارد</p>
          <p className="mt-1 text-xs text-slate-500">مناسب سفارش‌های عادی</p>
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => setShippingMethod("express")}
          className={cn(
            "rounded-2xl border p-4 text-right transition focus-visible:ring-4 focus-visible:ring-rose-100 disabled:opacity-60",
            shippingMethod === "express" ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-white hover:bg-slate-50",
          )}
        >
          <p className="font-bold text-slate-900">ارسال سریع</p>
          <p className="mt-1 text-xs text-slate-500">تحویل سریع‌تر با هزینه بیشتر</p>
        </button>
      </div>

      {shippingQuote.isError ? (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {shippingQuote.error instanceof Error ? shippingQuote.error.message : "امکان محاسبه ارسال وجود ندارد."}
        </p>
      ) : null}

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
            onLocationSelect={onMapLocationSelect}
            onClose={() => setShowMap(false)}
            initialLat={mapLocation?.lat}
            initialLng={mapLocation?.lng}
          />
        </Suspense>
      )}
    </Card>
  );
}
