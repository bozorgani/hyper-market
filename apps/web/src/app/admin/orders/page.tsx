import type { Metadata } from "next";
import { AdminOrdersClient } from "@/features/admin/orders-client";

export const metadata: Metadata = {
  title: "سفارش‌ها | پنل مدیریت",
  description: "مدیریت سفارش‌ها در پنل ادمین هایپرمارکت",
  robots: { index: false, follow: false },
};

export default function AdminOrdersPage() {
  return <AdminOrdersClient />;
}
