"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
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
      const order = await createOrder.mutateAsync();
      await createPayment.mutateAsync(order._id);
      await simulateSuccess.mutateAsync(order._id);
      router.push(`/order/success?orderId=${order._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    }
  }

  return (
    <ProtectedRoute>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-black">Checkout</h1>
        <Card className="mt-5 p-6">
          <p className="text-slate-500">Cart total</p>
          <p className="mt-2 text-3xl font-black text-rose-600">{formatPrice(cart.data?.totalPrice ?? 0)}</p>
          <p className="mt-4 text-sm text-slate-500">Mock payment abstraction will create an order, create payment and simulate success.</p>
          {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}
          <Button className="mt-6 w-full" onClick={checkout} disabled={createOrder.isPending || createPayment.isPending || simulateSuccess.isPending}>Pay now</Button>
        </Card>
      </main>
    </ProtectedRoute>
  );
}
