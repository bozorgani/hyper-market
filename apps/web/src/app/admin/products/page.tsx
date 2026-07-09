import type { Metadata } from "next";
import { AdminProductsClient } from "@/features/admin/products-client";

export const metadata: Metadata = {
  title: "محصولات | پنل مدیریت",
  description: "مدیریت محصولات در پنل ادمین هایپرمارکت",
  robots: { index: false, follow: false },
};

export default function AdminProductsPage() {
  return <AdminProductsClient />;
}
