import type { Metadata } from "next";
import { AdminOrderDetailClient } from "@/features/admin/admin-order-detail-client";

export const metadata: Metadata = {
  title: "جزئیات سفارش | پنل مدیریت",
  robots: { index: false, follow: false },
};

export default function AdminOrderDetailPage() {
  return <AdminOrderDetailClient />;
}
