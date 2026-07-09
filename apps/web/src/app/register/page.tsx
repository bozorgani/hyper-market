import type { Metadata } from "next";
import { RegisterPageClient } from "@/features/public-pages/register-page-client";

export const metadata: Metadata = {
  title: "ثبت‌نام",
  description: "ایجاد حساب کاربری جدید در هایپرمارکت",
  robots: { index: false, follow: false },
  alternates: { canonical: "/register" },
};

export default function RegisterPage() {
  return <RegisterPageClient />;
}
