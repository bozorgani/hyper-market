import type { Metadata } from "next";
import { CheckoutPageClient } from "@/features/public-pages/checkout-page-client";

export const metadata: Metadata = {
  title: "تسویه حساب",
  description: "تکمیل اطلاعات ارسال و ثبت سفارش در هایپرمارکت — پرداخت در محل.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/checkout" },
};

export default function CheckoutPage() {
  return <CheckoutPageClient />;
}
