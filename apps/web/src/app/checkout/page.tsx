"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
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
import { trackAnalyticsEvent } from "@/lib/analytics";
import { createIdempotencyKey } from "@/lib/idempotency";
import { formatPrice } from "@/lib/utils";
import type { DeliveryAddress, DeliveryWindow } from "@/types/domain";
import { useCart } from "@/hooks/use-cart";
import { useCreateOrder, useCreatePayment, useSimulatePaymentSuccess } from "@/hooks/use-orders";

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
  { value: "09:00-12:00", label: "۹ تا ۱۲" },
  { value: "12:00-15:00", label: "۱۲ تا ۱۵" },
  { value: "15:00-18:00", label: "۱۵ تا ۱۸" },
  { value: "18:00-21:00", label: "۱۸ تا ۲۱" },
];

function stepIndex(step: CheckoutStep) {
  return checkoutSteps.findIndex((item) => item.key === step);
}

function todayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
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
  const submittingRef = useRef(false);

  const detailedItems = cart.data?.items ?? [];
  const totalPrice = cart.data?.totalPrice ?? 0;
  const mutationPending = createOrder.isPending || createPayment.isPending || simulateSuccess.isPending;
  const isSubmitting = mutationPending || submittingRef.current;
  const activeStepIndex = stepIndex(currentStep);
  const deliveryFormValid = isDeliveryAddressValid(deliveryAddress) && Boolean(deliveryWindow.date && deliveryWindow.timeSlot);
  const cartErrorMessage = useMemo(() => {
    if (!cart.error) return "";
    return cart.error instanceof Error ? cart.error.message : "دریافت اطلاعات سبد خرید ناموفق بود.";
  }, [cart.error]);

  async function checkout() {
    if (submittingRef.current || mutationPending) return;

    if (!deliveryFormValid) {
      const message = "لطفاً آدرس تحویل و بازه زمانی ارسال را کامل و معتبر وارد کنید.";
      setError(message);
      showToast({ type: "error", title: "اطلاعات تحویل ناقص است", description: message });
      return;
    }

    const keys = attemptKeys ?? createCheckoutAttemptKeys();
    setAttemptKeys(keys);
    submittingRef.current = true;
    setError("");

    try {
      trackAnalyticsEvent({ type: "CHECKOUT_START", metadata: { totalPrice, attemptId: keys.attemptId } });

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
      trackAnalyticsEvent({ type: "ORDER_CREATED", metadata: { orderId: order._id, amount: order.totalPrice, attemptId: keys.attemptId } });

      setCurrentStep("creating_payment");
      await createPayment.mutateAsync({ orderId: order._id, idempotencyKey: keys.paymentCreate });

      setCurrentStep("confirming_payment");
      await simulateSuccess.mutateAsync({ orderId: order._id, idempotencyKey: keys.paymentSuccess });
      trackAnalyticsEvent({ type: "PAYMENT_SUCCESS", metadata: { orderId: order._id, amount: order.totalPrice, attemptId: keys.attemptId } });

      setCurrentStep("redirecting");
      showToast({ type: "success", title: "پرداخت آزمایشی با موفقیت انجام شد" });
      router.push(`/order/success?orderId=${order._id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "پرداخت ناموفق بود.";
      submittingRef.current = false;
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
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-24" />
                    </div>
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
                  <Button type="button" variant="outline" onClick={() => cart.refetch()}>
                    تلاش مجدد
                  </Button>
                  <Link href="/cart">
                    <Button type="button">بازگشت به سبد خرید</Button>
                  </Link>
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
              actions={
                <Link href="/products">
                  <Button type="button">مشاهده محصولات</Button>
                </Link>
              }
            />
          </div>
        ) : null}

        {!cart.isLoading && !cartErrorMessage && detailedItems.length > 0 ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-[1.35fr,0.95fr]">
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

              <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <h2 className="text-lg font-black">آدرس و زمان تحویل</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">ثبت سفارش بدون آدرس تحویل و انتخاب بازه ارسال امکان‌پذیر نیست.</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <Input value={deliveryAddress.recipientName} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, recipientName: e.target.value })} placeholder="نام تحویل‌گیرنده" disabled={isSubmitting} />
                  <Input value={deliveryAddress.phoneNumber} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 11) })} placeholder="شماره موبایل مثل 09123456789" inputMode="numeric" maxLength={11} disabled={isSubmitting} />
                  <Input value={deliveryAddress.province} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, province: e.target.value })} placeholder="استان" disabled={isSubmitting} />
                  <Input value={deliveryAddress.city} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, city: e.target.value })} placeholder="شهر" disabled={isSubmitting} />
                  <Input className="md:col-span-2" value={deliveryAddress.addressLine} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, addressLine: e.target.value })} placeholder="آدرس کامل" disabled={isSubmitting} />
                  <Input value={deliveryAddress.plate ?? ''} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, plate: e.target.value })} placeholder="پلاک" disabled={isSubmitting} />
                  <Input value={deliveryAddress.unit ?? ''} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, unit: e.target.value })} placeholder="واحد" disabled={isSubmitting} />
                  <Input value={deliveryAddress.postalCode ?? ''} onChange={(e) => setDeliveryAddress({ ...deliveryAddress, postalCode: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="کد پستی ۱۰ رقمی، اختیاری" inputMode="numeric" maxLength={10} disabled={isSubmitting} />
                  <Input type="date" value={deliveryWindow.date} min={todayDateInputValue()} onChange={(e) => setDeliveryWindow({ ...deliveryWindow, date: e.target.value })} disabled={isSubmitting} />
                  <select value={deliveryWindow.timeSlot} onChange={(e) => setDeliveryWindow({ ...deliveryWindow, timeSlot: e.target.value })} disabled={isSubmitting} className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-right text-sm outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100 disabled:bg-slate-100">
                    {deliveryTimeSlots.map((slot) => <option key={slot.value} value={slot.value}>{slot.label}</option>)}
                  </select>
                </div>
                {!deliveryFormValid ? <p className="mt-3 text-xs leading-6 text-amber-600">شماره موبایل باید با 09 شروع شود؛ آدرس حداقل ۱۰ کاراکتر و کد پستی در صورت ورود باید ۱۰ رقم باشد.</p> : null}
              </div>
            </Card>

            <Card className="p-6">
              <p className="text-sm text-slate-500">مبلغ قابل پرداخت</p>
              <p className="mt-2 text-3xl font-black text-rose-600">{formatPrice(totalPrice)}</p>
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
                          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                            isDone
                              ? "bg-emerald-500 text-white"
                              : isActive
                                ? "bg-rose-600 text-white shadow-sm shadow-rose-200"
                                : "bg-white text-slate-400 ring-1 ring-slate-200"
                          }`}
                        >
                          {isDone ? "✓" : index + 1}
                        </span>
                        <div>
                          <p className={`text-sm font-bold ${isWaiting ? "text-slate-500" : "text-slate-900"}`}>{step.title}</p>
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
          description={`سفارش شما با مبلغ ${formatPrice(totalPrice)} ثبت می‌شود و پرداخت mock به‌صورت خودکار موفق خواهد شد. ادامه می‌دهید؟`}
          confirmText={error && attemptKeys ? "بله، تلاش مجدد" : "بله، ثبت سفارش"}
          cancelText="بازگشت"
          loading={isSubmitting}
          onCancel={() => {
            if (!isSubmitting) setConfirmOpen(false);
          }}
          onConfirm={checkout}
        />
      </main>
    </ProtectedRoute>
  );
}
