"use client";

import Link from "next/link";
import { MapPin, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Address } from "@/types/domain";

export function todayDateInputValue() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

type DeliveryAddressSectionProps = {
  deliveryAddress: { recipientName: string; phoneNumber: string; province: string; city: string; addressLine: string };
  savedAddresses: { data?: Address[] };
  selectedAddressId?: string;
  onApplySavedAddress: (addressId: string) => void;
};

export function DeliveryAddressSection({
  deliveryAddress,
  savedAddresses,
  selectedAddressId,
  onApplySavedAddress,
}: DeliveryAddressSectionProps) {
  const addresses = savedAddresses.data ?? [];

  // User has saved addresses — show selector with address preview
  if (addresses.length > 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-rose-600" />
          <p className="text-lg font-black text-slate-900">آدرس تحویل</p>
        </div>

        <label className="mt-4 block space-y-2">
          <span className="text-sm font-semibold text-slate-600">انتخاب آدرس</span>
          <select
            onChange={(event) => onApplySavedAddress(event.target.value)}
            value={selectedAddressId ?? ""}
            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-right text-sm outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
          >
            <option value="" disabled>انتخاب آدرس</option>
            {addresses.map((address) => (
              <option key={address._id} value={address._id}>
                {address.isDefault ? "پیش‌فرض — " : ""}{address.label || address.recipientName}، {address.city}
              </option>
            ))}
          </select>
        </label>

        {/* Selected address preview */}
        {deliveryAddress.recipientName && (
          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
            <p className="font-bold text-slate-900">{deliveryAddress.recipientName}</p>
            <p className="mt-1">{deliveryAddress.province}، {deliveryAddress.city}</p>
            <p>{deliveryAddress.addressLine}</p>
            <p className="mt-1 text-xs text-slate-400">{deliveryAddress.phoneNumber}</p>
          </div>
        )}

        <div className="mt-4">
          <Link href="/profile/addresses">
            <Button type="button" variant="outline" size="sm">
              <Plus className="h-4 w-4" />
              مدیریت آدرس‌ها
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  // No saved addresses — prompt user to add one
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 text-rose-600" />
        <p className="text-lg font-black text-slate-900">آدرس تحویل</p>
      </div>
      <p className="mt-4 text-sm leading-7 text-slate-500">
        برای ثبت سفارش ابتدا باید یک آدرس تحویل در پروفایل خود ثبت کنید.
      </p>
      <div className="mt-4">
        <Link href="/profile/addresses">
          <Button type="button">
            <Plus className="h-4 w-4" />
            افزودن آدرس جدید
          </Button>
        </Link>
      </div>
    </Card>
  );
}
