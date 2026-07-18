"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { createIdempotencyKey } from "@/lib/idempotency";
import { formatNumber, formatPrice } from "@/lib/utils";
import { useMyAddresses } from "@/hooks/use-addresses";
import { useCart } from "@/hooks/use-cart";
import { useAvailableCoupons, useValidateCoupon, type CouponValidationResult } from "@/hooks/use-coupons";
import { useCreateOrder, useCreatePayment } from "@/hooks/use-orders";
import { useShippingQuote, type ShippingMethod } from "@/hooks/use-shipping";
import { isCustomerRole } from "@/lib/auth";
import { useAuthStore } from "@/store/auth-store";
import { DeliveryAddressSection, todayDateInputValue } from "@/features/public-pages/checkout/delivery-address-section";
import { CouponSection } from "@/features/public-pages/checkout/coupon-section";
import { OrderSummaryCard } from "@/features/public-pages/checkout/order-summary-card";
import { JalaliDatePicker } from "@/components/jalali-date-picker";
import { ProtectedRoute } from "@/components/layout/protected-route";
import type { DeliveryAddress, DeliveryWindow } from "@/types/domain";

type CheckoutStep = "idle" | "creating_order" | "confirming_payment" | "redirecting";

type CheckoutAttemptKeys = {
  attemptId: string;
  order: string;
  paymentCreate: string;
};

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
  const steps: { key: CheckoutStep }[] = [
    { key: "creating_order" },
    { key: "confirming_payment" },
    { key: "redirecting" },
  ];
  return steps.findIndex((item) => item.key === step);
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

export function CheckoutPageClient() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const isCustomer = isCustomerRole(user?.role);
  const isAuthenticatedCustomer = Boolean(hydrated && isCustomer);
  const cart = useCart(isAuthenticatedCustomer);
  const savedAddresses = useMyAddresses(isAuthenticatedCustomer);
  const createOrder = useCreateOrder();
  const createPayment = useCreatePayment();
  const validateCoupon = useValidateCoupon();
  const availableCoupons = useAvailableCoupons(isAuthenticatedCustomer);
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
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("standard");
  const [isLocalSubmitting, setIsLocalSubmitting] = useState(false);
  const [discountInput, setDiscountInput] = useState("");
  const [discountError, setDiscountError] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<CouponValidationResult | null>(null);
  const addressInitializedRef = useRef(false);

  const detailedItems = cart.data?.items ?? [];
  const totalPrice = cart.data?.totalPrice ?? 0;
  const discountAmount = appliedDiscount?.discountAmount ?? 0;
  const merchandiseTotal = appliedDiscount?.total ?? totalPrice;
  const mutationPending = createOrder.isPending || createPayment.isPending;
  const isSubmitting = mutationPending || isLocalSubmitting;
  const activeStepIndex = stepIndex(currentStep);
  const deliveryFormValid = isDeliveryAddressValid(deliveryAddress) && Boolean(deliveryWindow.date && deliveryWindow.timeSlot);
  const shippingQuote = useShippingQuote({
    address: deliveryAddress,
    deliveryWindow,
    method: shippingMethod,
    couponCode: appliedDiscount?.code,
    enabled: deliveryFormValid && detailedItems.length > 0,
  });
  const deliveryFee = shippingQuote.data?.deliveryFee ?? 0;
  const finalPrice = merchandiseTotal + deliveryFee;

  // Find which saved address ID matches the current delivery address (if any)
  const selectedAddressId = useMemo(() => {
    const addrList = savedAddresses.data ?? [];
    if (addrList.length === 0) return undefined;
    const match = addrList.find(
      (a) =>
        a.recipientName === deliveryAddress.recipientName &&
        a.phoneNumber === deliveryAddress.phoneNumber &&
        a.province === deliveryAddress.province &&
        a.city === deliveryAddress.city &&
        a.addressLine === deliveryAddress.addressLine,
    );
    return match?._id;
  }, [deliveryAddress, savedAddresses.data]);
  const cartErrorMessage = useMemo(() => {
    if (!cart.error) return "";
    return cart.error instanceof Error ? cart.error.message : "دریافت اطلاعات سبد خرید ناموفق بود.";
  }, [cart.error]);

  useEffect(() => {
    if (hydrated && user && !isCustomer) {
      router.replace("/admin");
    }
  }, [hydrated, isCustomer, router, user]);

  // Auto-select default address when saved addresses first load
  useEffect(() => {
    if (addressInitializedRef.current) return;
    if (!savedAddresses.data || savedAddresses.data.length === 0) return;

    const defaultAddr = savedAddresses.data.find((a) => a.isDefault) ?? savedAddresses.data[0];
    if (defaultAddr) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDeliveryAddress({
        recipientName: defaultAddr.recipientName,
        phoneNumber: defaultAddr.phoneNumber,
        province: defaultAddr.province,
        city: defaultAddr.city,
        addressLine: defaultAddr.addressLine,
        plate: defaultAddr.plate ?? "",
        unit: defaultAddr.unit ?? "",
        postalCode: defaultAddr.postalCode ?? "",
      });
    }
    addressInitializedRef.current = true;
  }, [savedAddresses.data]);

  function applySavedAddress(addressId: string) {
    const address = (savedAddresses.data ?? []).find((item) => item._id === addressId);
    if (!address) return;
    setDeliveryAddress({
      recipientName: address.recipientName,
      phoneNumber: address.phoneNumber,
      province: address.province,
      city: address.city,
      addressLine: address.addressLine,
      plate: address.plate ?? "",
      unit: address.unit ?? "",
      postalCode: address.postalCode ?? "",
    });
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
      trackAnalyticsEvent({
        type: "CHECKOUT_START",
        metadata: { totalPrice: finalPrice, deliveryFee, shippingMethod, attemptId: keys.attemptId },
      });

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
        couponCode: appliedDiscount?.code,
        shippingMethod,
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
            <LinkButton href="/products">مشاهده محصولات</LinkButton>
          }
        />
      ) : null}

      {!cart.isLoading && !cart.isError && cart.data && detailedItems.length > 0 ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.35fr,0.95fr]">
          <div className="space-y-4">
            {/* Address selection — simple dropdown or add-address prompt */}
            <DeliveryAddressSection
              savedAddresses={savedAddresses}
              selectedAddressId={selectedAddressId}
              onApplySavedAddress={applySavedAddress}
            />

            {/* Delivery time slot */}
            <Card className="p-6">
              <p className="text-lg font-black text-slate-900 mb-4">زمان تحویل</p>
              <div className="grid gap-3 md:grid-cols-2">
                <JalaliDatePicker
                  value={deliveryWindow.date}
                  min={todayDateInputValue()}
                  onChange={(iso) => setDeliveryWindow({ ...deliveryWindow, date: iso })}
                  disabled={isSubmitting}
                />
                <select
                  value={deliveryWindow.timeSlot}
                  onChange={(e) => setDeliveryWindow({ ...deliveryWindow, timeSlot: e.target.value })}
                  disabled={isSubmitting}
                  aria-label="بازه زمانی تحویل"
                  className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-right text-sm outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100 disabled:bg-slate-100"
                >
                  {deliveryTimeSlots.map((slot) => (
                    <option key={slot.value} value={slot.value}>{slot.emoji} {slot.label}</option>
                  ))}
                </select>
              </div>
            </Card>

            {/* Shipping method */}
            <Card className="p-6">
              <p className="text-lg font-black text-slate-900 mb-4">روش ارسال</p>
              <div className="grid gap-3 sm:grid-cols-2">
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
            </Card>

            <CouponSection
              discountInput={discountInput}
              setDiscountInput={setDiscountInput}
              setDiscountError={setDiscountError}
              discountError={discountError}
              appliedDiscount={appliedDiscount}
              setAppliedDiscount={setAppliedDiscount}
              validateCoupon={validateCoupon}
              availableCoupons={availableCoupons}
              isSubmitting={isSubmitting}
            />
          </div>
          <OrderSummaryCard
            finalPrice={finalPrice}
            totalPrice={totalPrice}
            discountAmount={discountAmount}
            appliedDiscount={appliedDiscount}
            deliveryFee={deliveryFee}
            shippingQuote={shippingQuote}
            error={error}
            attemptKeys={attemptKeys}
            currentStep={currentStep}
            activeStepIndex={activeStepIndex}
            isSubmitting={isSubmitting}
            deliveryFormValid={deliveryFormValid}
            onConfirm={() => setConfirmOpen(true)}
            onResetAttempt={resetCheckoutAttempt}
          />
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
    </main>
    </ProtectedRoute>
  );
}
