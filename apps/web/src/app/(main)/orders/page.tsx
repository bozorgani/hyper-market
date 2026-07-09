import type { Metadata } from "next";
import { OrdersPageClient } from "@/features/public-pages/orders-page-client";

export const metadata: Metadata = {
  title: "سفارش‌های من",
  description: "مشاهده تاریخچه سفارش‌ها و پیگیری وضعیت ارسال در هایپرمارکت.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/orders" },
};

export default function OrdersPage() {
  return <OrdersPageClient />;
}
