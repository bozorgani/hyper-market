import type { Metadata } from "next";
import { AdminRolesClient } from "@/features/admin/roles-client";

export const metadata: Metadata = {
  title: "نقش‌ها | پنل مدیریت",
  description: "مدیریت نقش‌ها در پنل ادمین هایپرمارکت",
  robots: { index: false, follow: false },
};

export default function AdminRolesPage() {
  return <AdminRolesClient />;
}
