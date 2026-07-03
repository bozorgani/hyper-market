"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, lazy, useMemo, useState } from "react";
import { MapPin, Navigation, ChevronDown, Tag, X, Gift, Ticket, Percent, Loader2 } from "lucide-react";
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
import { useCreateOrder, useCreatePayment, useSimulatePaymentSuccess } from "@/hooks/use-orders";

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

type CheckoutStep = "idle" | "creating_order" | "creating_payment" | "confirming_payment" | "redirecting";

type CheckoutAttemptKeys = {
  attemptId: string;
  order: string;
  paymentCreate: string;
  paymentSuccess: string;
};

const checkoutSteps: { key: Exclude<CheckoutStep, "idle">; title: string; description: string }[] = [
  { key: "creating_order", title: "ثبت سفارش", description: "ایجاد سفارش از اقلام سبد خرید" },
  { key: "creating_payment", title: "ایجاد پرداخت", description: "ساخت تراکنش پرداخت آزمایشی" },
  { key: "confirming_payment", title: "تأیید پرداخت", description: "موفق‌سازی پرداخت mock" },
  { key: "redirecting", title: "انتقال", description: "هدایت به صفحه موفقیت سفارش" },
];

function createCheckoutAttemptKeys(): CheckoutAttemptKeys {
  const attemptId = createIdempotencyKey("checkout");
  return {
    attemptId,
    order: `${attemptId}:order`,
    paymentCreate: `${attemptId}:payment-create`,
    paymentSuccess: `${attemptId}:payment-success`,
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

export default function CheckoutPage() {
  const router = useRouter();
  const cart = useCart();
  const createOrder = useCreateOrder();
  const createPayment = useCreatePayment();
  const simulateSuccess = useSimulatePaymentSuccess();
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

  // Map state
  const [showMap, setShowMap] = useState(false);
  const [mapLocation, setMapLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Discount state
  const [discountInput, setDiscountInput] = useState("");
  const [discountError, setDiscountError] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; percent: number } | null>(null);
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);

  const detailedItems = cart.data?.items ?? [];
  const totalPrice = cart.data?.totalPrice ?? 0;
  const discountAmount = appliedDiscount ? Math.round(totalPrice * (appliedDiscount.percent / 100)) : 0;
  const finalPrice = totalPrice - discountAmount;
  const mutationPending = createOrder.isPending || createPayment.isPending || simulateSuccess.isPending;
  const isSubmitting = mutationPending || isLocalSubmitting;
  const activeStepIndex = stepIndex(currentStep);
  const deliveryFormValid = isDeliveryAddressValid(deliveryAddress) && Boolean(deliveryWindow.date && deliveryWindow.timeSlot);
  const cartErrorMessage = useMemo(() => {
    if (!cart.error) return "";
    return cart.error instanceof Error ? cart.error.message : "دریافت اطلاعات سبد خرید ناموفق بود.";
  }, [cart.error]);

  function handleApplyDiscount() {
    if (!discountInput.trim()) return;
    setIsApplyingDiscount(true);
    setDiscountError("");

    // Simulate network delay
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
    // Try to extract province/city from the address, otherwise keep manual selection
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

      setCurrentStep("creating_payment");
      await createPayment.mutateAsync({ orderId: order._id, idempotencyKey: keys.paymentCreate });

      setCurrentStep("confirming_payment");
      await simulateSuccess.mutateAsync({ orderId: order._id, idempotencyKey: keys.paymentSuccess });

      setCurrentStep("redirecting");
      showToast({ type: "success", title: "پرداخت آزمایشی با موفقیت انجام شد" });
      router.push(`/order/success?orderId=${order._id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "پرداخت ناموفق بود.";
      setIsLocalSubmitting(false);
      setError(message);
      setConfirmOpen(false);
      showToast({ type: "error", title: "پرداخت انجام نشد", description: message });
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
          description="در این نسخه، فرایند پرداخت به‌صورت mock انجام می‌شود تا مسیر سفارش تا انتها قابل بررسی باشد."
        />

        {cart.isLoading ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-[1.35fr,0.95fr]">
            <Card className="p-6">
              <Skeleton className="h-7 w-40" />
              <div className="mt-6 space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 p-4">
                    <div className="space-y-2"><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-24" /></div>
                    <Skeleton className="h-5 w-24" />
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-6">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="mt-6 h-10 w-40" />
              <Skeleton className="mt-4 h-20 w-full" />
              <Skeleton className="mt-6 h-11 w-full" />
            </Card>
          </div>
        ) : null}

        {!cart.isLoading && cartErrorMessage ? (
          <div className="mt-6">
            <ErrorState
              title="دریافت اطلاعات تسویه حساب ناموفق بود"
              description={cartErrorMessage}
              actions={
                <>
                  <Button type="button" variant="outline" onClick={() => cart.refetch()}>تلاش مجدد</Button>
                  <Link href="/cart"><Button type="button">بازگشت به سبد خرید</Button></Link>
                </>
              }
            />
          </div>
        ) : null}

        {!cart.isLoading && !cartErrorMessage && detailedItems.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="سبد خرید شما برای پرداخت خالی است"
              description="برای شروع خرید، چند محصول به سبد اضافه کنید و دوباره به این صفحه برگردید."
              actions={<Link href="/products"><Button type="button">مشاهده محصولات</Button></Link>}
            />
          </div>
        ) : null}

        {!cart.isLoading && !cartErrorMessage && detailedItems.length > 0 ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-[1.35fr,0.95fr]">
            {/* ===== LEFT COLUMN: Order items + Address + Discount ===== */}
            <div className="space-y-4">
              {/* Order items */}
              <Card className="p-6">
                <h2 className="text-lg font-black">خلاصه اقلام سفارش</h2>
                <div className="mt-5 space-y-3">
                  {detailedItems.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 p-4">
                      <div>
                        <p className="font-semibold text-slate-900">{item.name}</p>
                        <p className="mt-1 text-sm text-slate-500">{item.quantity} عدد</p>
                      </div>
                      <p className="font-black text-rose-600">{formatPrice(item.lineTotal)}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Discount code */}
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-l from-amber-50 to-orange-50 px-6 pt-5 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                      <Ticket className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="font-black text-sm text-slate-900">کد تخفیف</h2>
                      <p className="text-xs text-slate-500">اگر کد تخفیف دارید وارد کنید</p>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  {!appliedDiscount ? (
                    <div>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <Input
                            value={discountInput}
                            onChange={(e) => {
                              setDiscountInput(e.target.value);
                              if (discountError) setDiscountError("");
                            }}
                            onKeyDown={(e) => e.key === "Enter" && handleApplyDiscount()}
                            placeholder="مثال: SNAPP20"
                            className={cn(
                              "ps-10 font-mono tracking-wider",
                              discountError && "border-red-300 focus:border-red-400 focus:ring-red-100"
                            )}
                            dir="ltr"
                            disabled={isSubmitting}
                          />
                          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        </div>
                        <Button
                          type="button"
                          onClick={handleApplyDiscount}
                          disabled={!discountInput.trim() || isApplyingDiscount || isSubmitting}
                          className="shrink-0"
                        >
                          {isApplyingDiscount ? <Loader2 className="w-4 h-4 animate-spin" /> : "اعمال"}
                        </Button>
                      </div>

                      {discountError && (
                        <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                          <X className="w-3.5 h-3.5 shrink-0" />
                          {discountError}
                        </p>
                      )}

                      <p className="flex items-center gap-1.5 mt-2.5 text-[11px] text-slate-400">
                        <span>کد آزمایشی:</span>
                        {["SNAPP20", "HYPERSALE", "WELCOME10"].map((code) => (
                          <button
                            key={code}
                            type="button"
                            onClick={() => { setDiscountInput(code); if (discountError) setDiscountError(""); }}
                            className="font-mono text-rose-600 font-medium bg-rose-50 px-1.5 py-0.5 rounded hover:bg-rose-100 transition-colors"
                          >
                            {code}
                          </button>
                        ))}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shrink-0">
                        <Percent className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-emerald-700">
                            {formatNumber(appliedDiscount.percent)}٪ تخفیف
                          </p>
                          <span className="bg-emerald-100 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded-md font-mono">
                            {appliedDiscount.code}
                          </span>
                        </div>
                        <p className="text-xs text-emerald-600 mt-0.5">
                          {formatPrice(discountAmount)} تومان تخفیف اعمال شد
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setAppliedDiscount(null); setDiscountInput(""); }}
                        className="w-8 h-8 rounded-lg hover:bg-white/80 flex items-center justify-center transition-colors"
                        disabled={isSubmitting}
                      >
                        <X className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                  )}
                </div>
              </Card>

              {/* Address & Delivery */}
              <Card className="p-6">
                <h2 className="text-lg font-black">آدرس و زمان تحویل</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">ثبت سفارش بدون آدرس تحویل و انتخاب بازه ارسال امکان‌پذیر نیست.</p>

                {/* Map CTA */}
                <button
                  type="button"
                  onClick={() => setShowMap(true)}
                  disabled={isSubmitting}
                  className={cn(
                    "w-full mt-4 rounded-2xl overflow-hidden text-right transition-all border-2",
                    mapLocation
                      ? "border-rose-300 bg-white"
                      : "border-dashed border-rose-300 hover:border-rose-400 bg-white"
                  )}
                >
                  <div className="relative h-32 bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 overflow-hidden">
                    {/* Decorative grid lines */}
                    <div className="absolute inset-0 opacity-[0.06]">
                      {[0,1,2,3,4].map((i) => (
                        <div key={`h-${i}`} className="absolute w-full h-px bg-slate-800" style={{ top: `${20 + i * 20}%` }} />
                      ))}
                      {[0,1,2,3].map((i) => (
                        <div key={`v-${i}`} className="absolute h-full w-px bg-slate-800" style={{ left: `${15 + i * 25}%` }} />
                      ))}
                    </div>

                    {mapLocation ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
                        <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                          <Navigation className="w-5 h-5 text-rose-600" />
                        </div>
                        <p className="text-xs font-bold text-rose-600">موقعیت روی نقشه انتخاب شد</p>
                        <p className="text-[10px] text-slate-500 px-6 text-center truncate max-w-xs">
                          {deliveryAddress.addressLine || `${mapLocation.lat.toFixed(4)}, ${mapLocation.lng.toFixed(4)}`}
                        </p>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                        <MapPin className="w-7 h-7 text-rose-400" />
                        <p className="text-sm font-bold text-slate-700">انتخاب آدرس از نقشه</p>
                        <p className="text-[11px] text-slate-400">نقشه را لمس کنید تا آدرس انتخاب شود</p>
                      </div>
                    )}

                    <div className="absolute top-2.5 left-2.5 bg-rose-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                      <MapPin className="w-3 h-3" />
                      نقشه
                    </div>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800">
                      {mapLocation ? "تغییر موقعیت روی نقشه" : "انتخاب موقعیت مکانی"}
                    </span>
                    <ChevronDown className="w-4 h-4 text-rose-600 -rotate-90" />
                  </div>
                </button>

                {/* Address form */}
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <Input value={deliveryAddress.recipientName} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, recipientName: e.target.value })} placeholder="نام تحویل‌گیرنده" disabled={isSubmitting} />
                  <Input value={deliveryAddress.phoneNumber} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, phoneNumber: e.target.value.replace(/\D/g, "").slice(0, 11) })} placeholder="شماره موبایل مثل 09123456789" inputMode="numeric" maxLength={11} disabled={isSubmitting} />
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
                  <Input className="md:col-span-2" value={deliveryAddress.addressLine} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, addressLine: e.target.value })} placeholder="آدرس کامل" disabled={isSubmitting} />
                  <Input value={deliveryAddress.plate ?? ""} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, plate: e.target.value })} placeholder="پلاک" disabled={isSubmitting} />
                  <Input value={deliveryAddress.unit ?? ""} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, unit: e.target.value })} placeholder="واحد" disabled={isSubmitting} />
                  <Input value={deliveryAddress.postalCode ?? ""} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, postalCode: e.target.value.replace(/\D/g, "").slice(0, 10) })} placeholder="کد پستی ۱۰ رقمی، اختیاری" inputMode="numeric" maxLength={10} disabled={isSubmitting} />
                  <JalaliDatePicker
                    value={deliveryWindow.date}
                    min={todayDateInputValue()}
                    onChange={(iso) => setDeliveryWindow({ ...deliveryWindow, date: iso })}
                    disabled={isSubmitting}
                  />
                  <select value={deliveryWindow.timeSlot} onChange={(e) => setDeliveryWindow({ ...deliveryWindow, timeSlot: e.target.value })} disabled={isSubmitting} className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-right text-sm outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100 disabled:bg-slate-100">
                    {deliveryTimeSlots.map((slot) => (
                      <option key={slot.value} value={slot.value}>{slot.emoji} {slot.label}</option>
                    ))}
                  </select>
                </div>
                {!deliveryFormValid ? <p className="mt-3 text-xs leading-6 text-amber-600">شماره موبایل باید با 09 شروع شود؛ آدرس حداقل ۱۰ کاراکتر و کد پستی در صورت ورود باید ۱۰ رقم باشد.</p> : null}
              </Card>
            </div>

            {/* ===== RIGHT COLUMN: Payment summary ===== */}
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

              <p className="mt-4 text-sm leading-7 text-slate-500">پس از تأیید، سفارش ثبت می‌شود، پرداخت mock موفق می‌شود و شما به صفحه موفقیت سفارش هدایت خواهید شد.</p>

              <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-slate-900">وضعیت پرداخت</p>
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
                  {isSubmitting ? "در حال پردازش پرداخت..." : error && attemptKeys ? "تلاش مجدد پرداخت" : "پرداخت و ثبت سفارش"}
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
          title="تأیید پرداخت آزمایشی"
          description={`سفارش شما با مبلغ ${formatPrice(finalPrice)} ثبت می‌شود${discountAmount > 0 ? ` (شامل ${formatNumber(appliedDiscount?.percent ?? 0)}٪ تخفیف)` : ""} و پرداخت mock به‌صورت خودکار موفق خواهد شد. ادامه می‌دهید؟`}
          confirmText={error && attemptKeys ? "بله، تلاش مجدد" : "بله، ثبت سفارش"}
          cancelText="بازگشت"
          loading={isSubmitting}
          onCancel={() => { if (!isSubmitting) setConfirmOpen(false); }}
          onConfirm={checkout}
        />

        {/* Map overlay */}
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