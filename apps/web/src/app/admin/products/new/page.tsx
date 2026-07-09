import type { Metadata } from "next";
import { AdminProductNewClient } from "@/features/admin/admin-product-new-client";

export const metadata: Metadata = {
  title: "محصول جدید | پنل مدیریت",
  robots: { index: false, follow: false },
};

export default function AdminProductNewPage() {
  return <AdminProductNewClient />;
}
