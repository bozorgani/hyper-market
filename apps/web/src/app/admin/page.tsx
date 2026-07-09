import type { Metadata } from "next";
import { AdminDashboardClient } from "@/features/admin/admin-dashboard-client";

export const metadata: Metadata = {
  title: "داشبورد مدیریت",
  description: "نمای کلی فروش، سفارش‌ها و موجودی فروشگاه هایپرمارکت",
  robots: { index: false, follow: false },
};

export default function AdminDashboardPage() {
  return <AdminDashboardClient />;
}
