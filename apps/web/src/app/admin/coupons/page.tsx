import type { Metadata } from "next";
import { AdminCouponsClient } from "@/features/admin/coupons-client";

export const metadata: Metadata = {
  title: "کوپن‌ها | پنل مدیریت",
  description: "مدیریت کوپن‌ها در پنل ادمین هایپرمارکت",
  robots: { index: false, follow: false },
};

export default function AdminCouponsPage() {
  return <AdminCouponsClient />;
}
