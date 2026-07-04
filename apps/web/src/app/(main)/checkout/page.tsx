"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, lazy, useMemo, useState } from "react";
import { MapPin, Navigation, Gift, Ticket, Percent, Loader2, X } from "lucide-react";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { createIdempotencyKey } from "@/lib/idempotency";
import { formatPrice, formatNumber } from "@/lib/utils";
import { JalaliDatePicker } from "@/components/jalali-date-picker";
import { IRAN_PROVINCES } from "@/data/iran-locations";
import type { DeliveryAddress, DeliveryWindow } from "@/types/domain";
import { useCart } from "@/hooks/use-cart";
import { useCreateOrder, useCreatePayment } from "@/hooks/use-orders";

const MapPicker = lazy(() =>
  import("@/components/ui/map-picker").then((m) => ({ default: m.MapPicker }))
);

/* ===== Discount code logic (client-side mock) ===== */
const VALID_DISCOUNT_CODES: Record<string, number> = {
  "SNAPP20": 20,
  "HYPERSALE": 15,
  "WELCOME10": 10,
  "FREE50": 50,
  "MARKET30": 30,
};

type CheckoutStep = "idle" | "creating_order" | "confirming_payment" | "redirecting";

type CheckoutAttemptKeys = {
  attemptId: string;
  order: string;
  paymentCreate: string;
};

const checkoutSteps: { key: Exclude<CheckoutStep, "idle">; title: string; description: string }[] = [
  { key: "creating_order", title: "ثبت سفارش", description: "ایجاد سفارش از اقلام سبد خرید" },
  { key: "confirming_payment", title: "تأیید پرداخت در محل", description: "ثبت پرداخت در محل و تأیید سفارش" },
  { key: "redirecting", title: "انتقال", description: "هدایت به صفحه موفقیت سفارش" },
];

function createCheckoutAttemptKeys(): CheckoutAttemptKeys {
  const attemptId = createIdempotencyKey("checkout");
  return {
    attemptId,
    order: `${attemptId}:order`,
    paymentCreate: `${attemptId}:payment-create`,
  };
}

const deliveryTimeSlots = [
  { value: "09:00-12:00", label: "۹ تا ۱۲", emoji: "☀️" },
  { value: "12:00-15:00", label: "۱۲ تا ۱۵", emoji: "🌤️" },
  { value: "15:00-18:00", label: "۱۵ تا ۱۸", emoji: "⛅" },
  { value: "18:00-21:00", label: "۱۸ تا ۲۱", emoji: "🌙" },
];

function stepIndex(step: CheckoutStep) {
  return checkoutSteps.findIndex((item) => item.key === step);
}

function todayDateInputValue() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function isDeliveryAddressValid(address: DeliveryAddress) {
  return (
    address.recipientName.trim().length >= 2 &&
    /^09\d{9}$/.test(address.phoneNumber.trim()) &&
    address.province.trim().length >= 2 &&
    address.city.trim().length >= 2 &&
    address.addressLine.trim().length >= 10 &&
    (!address.postalCode?.trim() || /^\d{10}$/.test(address.postalCode.trim()))
  );
}

function getFieldErrors(address: DeliveryAddress, window: DeliveryWindow) {
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
  if (!window.date) {
    errors.deliveryDate = "تاریخ تحویل را انتخاب کنید.";
  }
  if (!window.timeSlot) {
    errors.deliveryTime = "بازه زمانی را انتخاب کنید.";
  }
  return errors;
}

export default function CheckoutPage() {
  const router = useRouter();
  const cart = useCart();
  const createOrder = useCreateOrder();
  const createPayment = useCreatePayment();
  const { showToast } = useToast();
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<CheckoutStep>("idle");
  const [attemptKeys, setAttemptKeys] = useState<CheckoutAttemptKeys | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress>({
    recipientName: "",
    phoneNumber: "",
    province: "",
    city: "",
    addressLine: "",
    plate: "",
    unit: "",
    postalCode: "",
  });
  const [deliveryWindow, setDeliveryWindow] = useState<DeliveryWindow>({
    date: todayDateInputValue(),
    timeSlot: deliveryTimeSlots[0].value,
  });
  const [isLocalSubmitting, setIsLocalSubmitting] = useState(false);

  const [showMap, setShowMap] = useState(false);
  const [mapLocation, setMapLocation] = useState<{ lat: number; lng: number } | null>(null);

  const [discountInput, setDiscountInput] = useState("");
  const [discountError, setDiscountError] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; percent: number } | null>(null);
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);

  const detailedItems = cart.data?.items ?? [];
  const totalPrice = cart.data?.totalPrice ?? 0;
  const discountAmount = appliedDiscount ? Math.round(totalPrice * (appliedDiscount.percent / 100)) : 0;
  const finalPrice = totalPrice - discountAmount;
  const mutationPending = createOrder.isPending || createPayment.isPending;
  const isSubmitting = mutationPending || isLocalSubmitting;
  const activeStepIndex = stepIndex(currentStep);
  const deliveryFormValid = isDeliveryAddressValid(deliveryAddress) && Boolean(deliveryWindow.date && deliveryWindow.timeSlot);
  const fieldErrors = useMemo(() => getFieldErrors(deliveryAddress, deliveryWindow), [deliveryAddress, deliveryWindow]);
  const cartErrorMessage = useMemo(() => {
    if (!cart.error) return "";
    return cart.error instanceof Error ? cart.error.message : "دریافت اطلاعات سبد خرید ناموفق بود.";
  }, [cart.error]);

  function handleApplyDiscount() {
    if (!discountInput.trim()) return;
    setIsApplyingDiscount(true);
    setDiscountError("");
    setTimeout(() => {
      const percent = VALID_DISCOUNT_CODES[discountInput.toUpperCase()];
      if (percent) {
        setAppliedDiscount({ code: discountInput.toUpperCase(), percent });
        setDiscountError("");
        setDiscountInput("");
        showToast({ type: "success", title: `کد تخفیف اعمال شد — ${formatNumber(percent)}٪ تخفیف` });
      } else {
        setDiscountError("کد تخفیف نامعتبر است");
      }
      setIsApplyingDiscount(false);
    }, 600);
  }

  function handleMapLocationSelect(lat: number, lng: number, address: string) {
    setMapLocation({ lat, lng });
    setDeliveryAddress((prev) => ({
      ...prev,
      addressLine: address.length > 10 ? address : prev.addressLine,
    }));
    showToast({ type: "success", title: "آدرس از نقشه انتخاب شد" });
  }

  async function checkout() {
    if (isLocalSubmitting || mutationPending) return;
    if (!deliveryFormValid) {
      const message = "لطفاً آدرس تحویل و بازه زمانی ارسال را کامل و معتبر وارد کنید.";
      setError(message);
      showToast({ type: "error", title: "اطلاعات تحویل ناقص است", description: message });
      return;
    }

    const keys = attemptKeys ?? createCheckoutAttemptKeys();
    setAttemptKeys(keys);
    setIsLocalSubmitting(true);
    setError("");

    try {
      trackAnalyticsEvent({ type: "CHECKOUT_START", metadata: { totalPrice: finalPrice, attemptId: keys.attemptId } });

      setCurrentStep("creating_order");
      const order = await createOrder.mutateAsync({
        idempotencyKey: keys.order,
        deliveryAddress: {
          recipientName: deliveryAddress.recipientName.trim(),
          phoneNumber: deliveryAddress.phoneNumber.trim(),
          province: deliveryAddress.province.trim(),
          city: deliveryAddress.city.trim(),
          addressLine: deliveryAddress.addressLine.trim(),
          plate: deliveryAddress.plate?.trim() || null,
          unit: deliveryAddress.unit?.trim() || null,
          postalCode: deliveryAddress.postalCode?.trim() || null,
        },
        deliveryWindow: {
          date: `${deliveryWindow.date}T00:00:00.000Z`,
          timeSlot: deliveryWindow.timeSlot,
        },
      });

      setCurrentStep("confirming_payment");
      await createPayment.mutateAsync({ orderId: order._id, idempotencyKey: keys.paymentCreate });

      setCurrentStep("redirecting");
      showToast({ type: "success", title: "سفارش شما با موفقیت ثبت شد" });
      router.push(`/order/success?orderId=${order._id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "ثبت سفارش ناموفق بود.";
      setIsLocalSubmitting(false);
      setError(message);
      setConfirmOpen(false);
      showToast({ type: "error", title: "ثبت سفارش انجام نشد", description: message });
    }
  }

  function resetCheckoutAttempt() {
    if (isSubmitting) return;
    setAttemptKeys(null);
    setCurrentStep("idle");
    setError("");
    setConfirmOpen(true);
  }

  return (
    <ProtectedRoute>
      <main className="mx-auto max-w-4xl px-4 py-8 text-right">
        <PageHeader
          title="تسویه حساب"
          description="پرداخت در محل: مبلغ سفارش هنگام تحویل پرداخت می‌شود."
        />

        {cart.isLoading ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-[1.35fr,0.95fr]">
            <Card className="p-6">
              <Skeleton className="h-7 w-40" />
              <div className="mt-6 space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 p-4">
                    <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-16" /></div>
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-6"><Skeleton className="h-7 w-36" /><Skeleton className="mt-4 h-10 w-full" /><Skeleton className="mt-4 h-12 w-full" /></Card>
          </div>
        ) : null}

        {!cart.isLoading && cart.isError ? (
          <ErrorState
            title="خطا در دریافت سبد خرید"
            description={cartErrorMessage}
            actions={<Button type="button" variant="outline" onClick={() => cart.refetch()}>تلاش مجدد</Button>}
          />
        ) : null}

        {!cart.isLoading && !cart.isError && cart.data && detailedItems.length === 0 ? (
          <EmptyState
            title="سبد خرید خالی است"
            description="ابتدا محصولاتی را به سبد خرید اضافه کنید."
            actions={
              <Link href="/products">
                <Button type="button">مشاهده محصولات</Button>
              </Link>
            }
          />
        ) : null}

        {!cart.isLoading && !cart.isError && cart.data && detailedItems.length > 0 ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-[1.35fr,0.95fr]">
            <div className="space-y-4">
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

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div>
                    <Input value={deliveryAddress.recipientName} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, recipientName: e.target.value })} placeholder="نام تحویل‌گیرنده" disabled={isSubmitting} />
                    {fieldErrors.recipientName && <p className="mt-1 text-[11px] leading-5 text-rose-500">{fieldErrors.recipientName}</p>}
                  </div>
                  <div>
                    <Input value={deliveryAddress.phoneNumber} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, phoneNumber: e.target.value.replace(/\D/g, "").slice(0, 11) })} placeholder="شماره موبایل مثل 09123456789" inputMode="numeric" maxLength={11} disabled={isSubmitting} />
                    {fieldErrors.phoneNumber && <p className="mt-1 text-[11px] leading-5 text-rose-500">{fieldErrors.phoneNumber}</p>}
                  </div>
                  <div>
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
                    {fieldErrors.province && <p className="mt-1 text-[11px] leading-5 text-rose-500">{fieldErrors.province}</p>}
                  </div>
                  <div>
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
                    {fieldErrors.city && <p className="mt-1 text-[11px] leading-5 text-rose-500">{fieldErrors.city}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <Input value={deliveryAddress.addressLine} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, addressLine: e.target.value })} placeholder="آدرس کامل" disabled={isSubmitting} />
                    {fieldErrors.addressLine && <p className="mt-1 text-[11px] leading-5 text-rose-500">{fieldErrors.addressLine}</p>}
                  </div>
                  <Input value={deliveryAddress.plate ?? ""} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, plate: e.target.value })} placeholder="پلاک" disabled={isSubmitting} />
                  <Input value={deliveryAddress.unit ?? ""} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, unit: e.target.value })} placeholder="واحد" disabled={isSubmitting} />
                  <div>
                    <Input value={deliveryAddress.postalCode ?? ""} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, postalCode: e.target.value.replace(/\D/g, "").slice(0, 10) })} placeholder="کد پستی ۱۰ رقمی، اختیاری" inputMode="numeric" maxLength={10} disabled={isSubmitting} />
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
                    <select value={deliveryWindow.timeSlot} onChange={(e) => setDeliveryWindow({ ...deliveryWindow, timeSlot: e.target.value })} disabled={isSubmitting} className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-right text-sm outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100 disabled:bg-slate-100">
                      {deliveryTimeSlots.map((slot) => (
                        <option key={slot.value} value={slot.value}>{slot.emoji} {slot.label}</option>
                      ))}
                    </select>
                    {fieldErrors.deliveryTime && <p className="mt-1 text-[11px] leading-5 text-rose-500">{fieldErrors.deliveryTime}</p>}
                  </div>
                </div>
              </Card>

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
                    disabled={isApplyingDiscount || isSubmitting}
                    onKeyDown={(e) => { if (e.key === "Enter") handleApplyDiscount(); }}
                  />
                  <Button type="button" variant="outline" onClick={handleApplyDiscount} disabled={isApplyingDiscount || !discountInput.trim()}>
                    {isApplyingDiscount ? <Loader2 className="h-4 w-4 animate-spin" /> : <Percent className="h-4 w-4" />}
                    اعمال
                  </Button>
                </div>
                {discountError ? <p className="mt-2 text-sm text-red-600">{discountError}</p> : null}
                {appliedDiscount ? (
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                    <Gift className="h-4 w-4" />
                    {appliedDiscount.code} — {formatNumber(appliedDiscount.percent)}٪ تخفیف
                    <button type="button" onClick={() => setAppliedDiscount(null)} className="mr-auto text-emerald-500 hover:text-red-500"><X className="h-4 w-4" /></button>
                  </div>
                ) : null}
              </Card>
            </div>

            <Card className="p-6 h-fit lg:sticky lg:top-20">
              <p className="text-sm text-slate-500">مبلغ قابل پرداخت</p>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-3xl font-black text-rose-600">{formatPrice(finalPrice)}</p>
                {discountAmount > 0 && (
                  <span className="text-sm text-slate-400 line-through">{formatPrice(totalPrice)}</span>
                )}
              </div>
              {discountAmount > 0 && (
                <p className="mt-1 text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <Gift className="w-3.5 h-3.5" />
                  {formatNumber(appliedDiscount?.percent ?? 0)}٪ تخفیف = {formatPrice(discountAmount)} تومان
                </p>
              )}

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
                  {attemptKeys ? <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">تلاش فعال</span> : null}
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
                              ? "bg-emerald-500 text-white"
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
                  <p className="mt-2 text-xs text-red-500">برای جلوگیری از ثبت تکراری، تلاش مجدد با همان شناسه امن checkout انجام می‌شود.</p>
                </div>
              ) : null}
              <div className="mt-6 flex flex-col gap-3">
                <Button type="button" className="w-full" onClick={() => setConfirmOpen(true)} disabled={isSubmitting || !deliveryFormValid}>
                  {isSubmitting ? "در حال ثبت سفارش..." : error && attemptKeys ? "تلاش مجدد ثبت سفارش" : "ثبت سفارش — پرداخت در محل"}
                </Button>
                {error && attemptKeys ? (
                  <Button type="button" variant="secondary" className="w-full" onClick={resetCheckoutAttempt} disabled={isSubmitting}>
                    شروع تلاش جدید
                  </Button>
                ) : null}
                <Link href="/cart" aria-disabled={isSubmitting} className={isSubmitting ? "pointer-events-none" : undefined}>
                  <Button type="button" variant="outline" className="w-full" disabled={isSubmitting}>
                    بازگشت به سبد خرید
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        ) : null}

        <ConfirmDialog
          open={confirmOpen}
          title="تأیید ثبت سفارش"
          description={`سفارش شما با مبلغ ${formatPrice(finalPrice)} ثبت می‌شود${discountAmount > 0 ? ` (شامل ${formatNumber(appliedDiscount?.percent ?? 0)}٪ تخفیف)` : ""}. پرداخت در محل: مبلغ هنگام تحویل دریافت می‌شود. ادامه می‌دهید؟`}
          confirmText={error && attemptKeys ? "بله، تلاش مجدد" : "بله، ثبت سفارش"}
          cancelText="بازگشت"
          loading={isSubmitting}
          onCancel={() => { if (!isSubmitting) setConfirmOpen(false); }}
          onConfirm={checkout}
        />

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
      </main>
    </ProtectedRoute>
  );
}
