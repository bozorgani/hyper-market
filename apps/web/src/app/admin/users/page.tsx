import type { Metadata } from "next";
import { AdminUsersClient } from "@/features/admin/users-client";

export const metadata: Metadata = {
  title: "کاربران | پنل مدیریت",
  description: "مدیریت کاربران در پنل ادمین هایپرمارکت",
  robots: { index: false, follow: false },
};

export default function AdminUsersPage() {
  return <AdminUsersClient />;
}
