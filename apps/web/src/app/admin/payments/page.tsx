import type { Metadata } from "next";
import { AdminPaymentsClient } from "@/features/admin/payments-client";

export const metadata: Metadata = {
  title: "پرداخت‌ها | پنل مدیریت",
  description: "مدیریت پرداخت‌ها در پنل ادمین هایپرمارکت",
  robots: { index: false, follow: false },
};

export default function AdminPaymentsPage() {
  return <AdminPaymentsClient />;
}
