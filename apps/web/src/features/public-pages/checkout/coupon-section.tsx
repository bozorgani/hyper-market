"use client";

import { Gift, Loader2, Percent, Ticket, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";
import type { CouponValidationResult } from "@/hooks/use-coupons";

type CouponSectionProps = {
  discountInput: string;
  setDiscountInput: (value: string) => void;
  setDiscountError: (value: string) => void;
  discountError: string;
  appliedDiscount: CouponValidationResult | null;
  setAppliedDiscount: (value: CouponValidationResult | null) => void;
  validateCoupon: { isPending: boolean; mutateAsync: (code: string) => Promise<CouponValidationResult> };
  availableCoupons: { data?: { code: string; percent: number }[] };
  isSubmitting: boolean;
};

export function CouponSection({
  discountInput,
  setDiscountInput,
  setDiscountError,
  discountError,
  appliedDiscount,
  setAppliedDiscount,
  validateCoupon,
  availableCoupons,
  isSubmitting,
}: CouponSectionProps) {
  async function handleApplyDiscount() {
    const code = discountInput.trim();
    if (!code) return;
    setDiscountError("");

    try {
      const result = await validateCoupon.mutateAsync(code);
      setAppliedDiscount(result);
      setDiscountInput("");
    } catch {
      // Error is shown via discountError state set by the parent
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <Ticket className="h-5 w-5 text-violet-600" />
        <p className="text-lg font-black text-slate-900">کد تخفیف</p>
      </div>

      <div className="mt-4 flex gap-2">
        <Input
          value={discountInput}
          onChange={(e) => { setDiscountInput(e.target.value); setDiscountError(""); }}
          placeholder="مثلاً SNAPP20"
          disabled={validateCoupon.isPending || isSubmitting}
          onKeyDown={(e) => { if (e.key === "Enter") handleApplyDiscount(); }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleApplyDiscount}
          disabled={validateCoupon.isPending || !discountInput.trim()}
        >
          {validateCoupon.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Percent className="h-4 w-4" />}
          اعمال
        </Button>
      </div>

      {discountError ? <p className="mt-2 text-sm text-red-600">{discountError}</p> : null}

      {!appliedDiscount && (availableCoupons.data ?? []).length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {(availableCoupons.data ?? []).slice(0, 3).map((coupon) => (
            <button
              key={coupon.code}
              type="button"
              onClick={() => setDiscountInput(coupon.code)}
              className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700 transition hover:bg-violet-100"
            >
              {coupon.code} — {formatNumber(coupon.percent)}٪
            </button>
          ))}
        </div>
      ) : null}

      {appliedDiscount ? (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
          <Gift className="h-4 w-4" />
          {appliedDiscount.code} — {formatNumber(appliedDiscount.percent)}٪ تخفیف
          <button type="button" onClick={() => setAppliedDiscount(null)} className="mr-auto text-rose-500 hover:text-red-500">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </Card>
  );
}
