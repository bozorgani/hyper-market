import type { Metadata } from "next";
import { AdminProductEditClient } from "@/features/admin/admin-product-edit-client";

export const metadata: Metadata = {
  title: "ویرایش محصول | پنل مدیریت",
  robots: { index: false, follow: false },
};

export default function AdminProductEditPage() {
  return <AdminProductEditClient />;
}
