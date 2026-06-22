"use client";

import { ProtectedRoute } from "@/components/layout/protected-route";
import { OrderCard } from "@/components/order-card";
import { useMyOrders } from "@/hooks/use-orders";

export default function OrdersPage() {
  const orders = useMyOrders();

  return (
    <ProtectedRoute>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-black">Order history</h1>
        {orders.isLoading ? <p className="mt-8 text-slate-500">Loading orders...</p> : null}
        <div className="mt-5 space-y-4">
          {(orders.data ?? []).map((order) => <OrderCard key={order._id} order={order} />)}
          {orders.data?.length === 0 ? <p className="rounded-2xl bg-white p-6 text-slate-500">No orders yet.</p> : null}
        </div>
      </main>
    </ProtectedRoute>
  );
}
