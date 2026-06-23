"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { useCart } from "@/hooks/use-cart";
import { useCreateOrder, useCreatePayment, useSimulatePaymentSuccess } from "@/hooks/use-orders";

export default function CheckoutPage() {
  const router = useRouter();
  const cart = useCart();
  const createOrder = useCreateOrder();
  const createPayment = useCreatePayment();
  const simulateSuccess = useSimulatePaymentSuccess();
  const [error, setError] = useState("");

  async function checkout() {
    setError("");
    try {
      trackAnalyticsEvent({ type: "CHECKOUT_START", metadata: { totalPrice: cart.data?.totalPrice ?? 0 } });
      const order = await createOrder.mutateAsync();
      trackAnalyticsEvent({ type: "ORDER_CREATED", metadata: { orderId: order._id, amount: order.totalPrice } });
      await createPayment.mutateAsync(order._id);
      await simulateSuccess.mutateAsync(order._id);
      trackAnalyticsEvent({ type: "PAYMENT_SUCCESS", metadata: { orderId: order._id, amount: order.totalPrice } });
      router.push(`/order/success?orderId=${order._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "پرداخت ناموفق بود.");
    }
  }

  return (
    <ProtectedRoute>
      <main className="mx-auto max-w-3xl px-4 py-8 text-right">
        <h1 className="text-2xl font-black">تسویه حساب</h1>
        <Card className="mt-5 p-6">
          <p className="text-slate-500">مبلغ قابل پرداخت</p>
          <p className="mt-2 text-3xl font-black text-rose-600">{formatPrice(cart.data?.totalPrice ?? 0)}</p>
          <p className="mt-4 text-sm leading-7 text-slate-500">در این نسخه، پرداخت به‌صورت آزمایشی انجام می‌شود و پس از پرداخت موفق، سفارش ثبت و پرداخت‌شده نمایش داده می‌شود.</p>
          {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm leading-6 text-red-600">{error}</p>}
          <Button className="mt-6 w-full" onClick={checkout} disabled={createOrder.isPending || createPayment.isPending || simulateSuccess.isPending}>
            پرداخت و ثبت سفارش
          </Button>
        </Card>
      </main>
    </ProtectedRoute>
  );
}
