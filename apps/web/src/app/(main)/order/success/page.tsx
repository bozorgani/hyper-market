import type { Metadata } from "next";
import { OrderSuccessPageClient } from "@/features/public-pages/order-success-page-client";

export const metadata: Metadata = {
  title: "سفارش موفق",
  description: "سفارش شما با موفقیت ثبت شد.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/order/success" },
};

export default function OrderSuccessPage() {
  return <OrderSuccessPageClient />;
}
