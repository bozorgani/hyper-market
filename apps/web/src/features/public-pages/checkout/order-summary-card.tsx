"use client";

import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { Button } from "@/components/ui/button";
import { cn, formatNumber, formatPrice } from "@/lib/utils";
import type { CouponValidationResult } from "@/hooks/use-coupons";

type CheckoutStep = "idle" | "creating_order" | "confirming_payment" | "redirecting";

const checkoutSteps: { key: Exclude<CheckoutStep, "idle">; title: string; description: string }[] = [
  { key: "creating_order", title: "ثبت سفارش", description: "ایجاد سفارش از اقلام سبد خرید" },
  { key: "confirming_payment", title: "تأیید پرداخت در محل", description: "ثبت پرداخت در محل و تأیید سفارش" },
  { key: "redirecting", title: "انتقال", description: "هدایت به صفحه موفقیت سفارش" },
];

type OrderSummaryCardProps = {
  finalPrice: number;
  totalPrice: number;
  discountAmount: number;
  appliedDiscount: CouponValidationResult | null;
  deliveryFee: number;
  shippingQuote: {
    isLoading?: boolean;
    isError?: boolean;
    data?: { freeShippingApplied?: boolean } | null;
  };
  error: string;
  attemptKeys: { attemptId: string } | null;
  currentStep: CheckoutStep;
  activeStepIndex: number;
  isSubmitting: boolean;
  deliveryFormValid: boolean;
  onConfirm: () => void;
  onResetAttempt: () => void;
};

export function OrderSummaryCard({
  finalPrice,
  totalPrice,
  discountAmount,
  appliedDiscount,
  deliveryFee,
  shippingQuote,
  error,
  attemptKeys,
  currentStep,
  activeStepIndex,
  isSubmitting,
  deliveryFormValid,
  onConfirm,
  onResetAttempt,
}: OrderSummaryCardProps) {
  return (
    <Card className="p-6 h-fit lg:sticky lg:top-20">
      <p className="text-sm text-slate-500">صورتحساب</p>

      {/* Price breakdown */}
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">قیمت کالاها</span>
          <span className="font-semibold text-slate-800">{formatPrice(totalPrice)}</span>
        </div>

        {discountAmount > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 text-emerald-600">
              <span>✨</span>
              تخفیف ({formatNumber(appliedDiscount?.percent ?? 0)}٪)
            </span>
            <span className="font-semibold text-emerald-600">-{formatPrice(discountAmount)}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">هزینه ارسال</span>
          <span className="font-semibold text-slate-800">
            {shippingQuote.isLoading ? "در حال محاسبه..." : deliveryFee === 0 ? "رایگان" : formatPrice(deliveryFee)}
          </span>
        </div>
        {shippingQuote.data?.freeShippingApplied ? (
          <p className="text-xs text-emerald-600">ارسال رایگان برای این سفارش اعمال شد.</p>
        ) : null}

        {/* Total divider */}
        <div className="border-t border-slate-200 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-base font-black text-slate-900">مبلغ قابل پرداخت</span>
            <p className="text-2xl font-black text-rose-600">{formatPrice(finalPrice)}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">📦</span>
          <p className="font-bold text-emerald-800">پرداخت در محل</p>
        </div>
        <p className="mt-2 text-sm leading-6 text-emerald-700">
          مبلغ سفارش هنگام تحویل توسط پیک دریافت می‌شود. پس از ثبت سفارش، تأیید پرداخت خودکار انجام می‌شود.
        </p>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-black text-slate-900">مراحل ثبت سفارش</p>
          {attemptKeys ? (
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">تلاش فعال</span>
          ) : null}
        </div>
        <div className="mt-4 space-y-3">
          {checkoutSteps.map((step, index) => {
            const isActive = currentStep === step.key;
            const isDone = activeStepIndex > index;
            const isWaiting = activeStepIndex < index || currentStep === "idle";

            return (
              <div key={step.key} className="flex gap-3">
                        <span
                          className={cn(
                            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black",
                            isDone
                              ? "bg-green-500 text-white"
                              : isActive
                                ? "bg-rose-600 text-white shadow-sm shadow-rose-200"
                                : "bg-white text-slate-400 ring-1 ring-slate-200"
                          )}
                >
                  {isDone ? "✓" : index + 1}
                </span>
                <div>
                  <p className={cn("text-sm font-bold", isWaiting ? "text-slate-500" : "text-slate-900")}>{step.title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-500">
                    {isActive ? "در حال انجام..." : isDone ? "انجام شد" : step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl bg-red-50 p-3 text-sm leading-6 text-red-600">
          <p>{error}</p>
          <p className="mt-2 text-xs text-red-500">
            برای جلوگیری از ثبت تکراری، تلاش مجدد با همان شناسه امن checkout انجام می‌شود.
          </p>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3">
        <Button
          type="button"
          className="w-full"
          onClick={onConfirm}
          disabled={isSubmitting || !deliveryFormValid || shippingQuote.isLoading || shippingQuote.isError}
        >
          {isSubmitting
            ? "در حال ثبت سفارش..."
            : error && attemptKeys
              ? "تلاش مجدد ثبت سفارش"
              : "ثبت سفارش — پرداخت در محل"}
        </Button>
        {error && attemptKeys ? (
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={onResetAttempt}
            disabled={isSubmitting}
          >
            شروع تلاش جدید
          </Button>
        ) : null}
        <LinkButton
          href="/cart"
          variant="outline"
          aria-disabled={isSubmitting}
          tabIndex={isSubmitting ? -1 : undefined}
          className={cn("w-full", isSubmitting && "pointer-events-none opacity-60")}
        >
          بازگشت به سبد خرید
        </LinkButton>
      </div>
    </Card>
  );
}
