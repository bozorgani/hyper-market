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

        <div className="mt-4 space-y-3">
          <span className="text-sm font-semibold text-slate-600">انتخاب آدرس</span>
          {addresses.map((address) => {
            const isSelected = selectedAddressId === address._id;
            return (
              <button
                key={address._id}
                type="button"
                onClick={() => onApplySavedAddress(address._id)}
                className={`w-full text-right rounded-2xl border p-4 transition ${
                  isSelected
                    ? "border-rose-300 bg-rose-50 ring-2 ring-rose-200"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    isSelected ? "border-rose-500 bg-rose-500" : "border-slate-300"
                  }`}>
                    {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900">{address.label || address.recipientName}</p>
                      {address.isDefault && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">پیش‌فرض</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-slate-600">{address.province}، {address.city}</p>
                    <p className="text-sm text-slate-500">{address.addressLine}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{address.recipientName} — {address.phoneNumber}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

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
