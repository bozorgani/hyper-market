import type { Metadata } from "next";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { OrderTrackingClient } from "@/features/public-pages/order-tracking-page-client";

export const metadata: Metadata = {
  title: "پیگیری سفارش",
  robots: { index: false, follow: false },
};

export default async function OrderTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <ProtectedRoute>
      <OrderTrackingClient orderId={id} />
    </ProtectedRoute>
  );
}
