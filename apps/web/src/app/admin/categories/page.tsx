import type { Metadata } from "next";
import { AdminCategoriesClient } from "@/features/admin/categories-client";

export const metadata: Metadata = {
  title: "دسته‌بندی‌ها | پنل مدیریت",
  description: "مدیریت دسته‌بندی‌ها در پنل ادمین هایپرمارکت",
  robots: { index: false, follow: false },
};

export default function AdminCategoriesPage() {
  return <AdminCategoriesClient />;
}
