"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";
import { useCreateOrder, useCreatePayment, useSimulatePaymentSuccess } from "@/hooks/use-orders";

export default function CheckoutPage() {
  const router = useRouter();
  const cart = useCart();
  const createOrder = useCreateOrder();
  const createPayment = useCreatePayment();
  const simulateSuccess = useSimulatePaymentSuccess();
  const { showToast } = useToast();
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const detailedItems = cart.data?.items ?? [];
  const totalPrice = cart.data?.totalPrice ?? 0;
  const isSubmitting = createOrder.isPending || createPayment.isPending || simulateSuccess.isPending;
  const cartErrorMessage = useMemo(() => {
    if (!cart.error) return "";
    return cart.error instanceof Error ? cart.error.message : "دریافت اطلاعات سبد خرید ناموفق بود.";
  }, [cart.error]);

  async function checkout() {
    setError("");
    try {
      trackAnalyticsEvent({ type: "CHECKOUT_START", metadata: { totalPrice } });
      const order = await createOrder.mutateAsync();
      trackAnalyticsEvent({ type: "ORDER_CREATED", metadata: { orderId: order._id, amount: order.totalPrice } });
      await createPayment.mutateAsync(order._id);
      await simulateSuccess.mutateAsync(order._id);
      trackAnalyticsEvent({ type: "PAYMENT_SUCCESS", metadata: { orderId: order._id, amount: order.totalPrice } });
      showToast({ type: "success", title: "پرداخت آزمایشی با موفقیت انجام شد" });
      router.push(`/order/success?orderId=${order._id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "پرداخت ناموفق بود.";
      setError(message);
      setConfirmOpen(false);
      showToast({ type: "error", title: "پرداخت انجام نشد", description: message });
    }
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
            </Card>

            <Card className="p-6">
              <p className="text-sm text-slate-500">مبلغ قابل پرداخت</p>
              <p className="mt-2 text-3xl font-black text-rose-600">{formatPrice(totalPrice)}</p>
              <p className="mt-4 text-sm leading-7 text-slate-500">پس از تأیید، سفارش ثبت می‌شود، پرداخت mock موفق می‌شود و شما به صفحه موفقیت سفارش هدایت خواهید شد.</p>
              {error ? <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm leading-6 text-red-600">{error}</p> : null}
              <div className="mt-6 flex flex-col gap-3">
                <Button type="button" className="w-full" onClick={() => setConfirmOpen(true)} disabled={isSubmitting}>
                  {isSubmitting ? "در حال ثبت سفارش..." : "پرداخت و ثبت سفارش"}
                </Button>
                <Link href="/cart">
                  <Button type="button" variant="outline" className="w-full">
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
          confirmText="بله، ثبت سفارش"
          cancelText="بازگشت"
          loading={isSubmitting}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={checkout}
        />
      </main>
    </ProtectedRoute>
  );
}
