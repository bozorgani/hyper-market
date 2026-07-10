import type { Metadata } from "next";
import { ForgotPasswordPageClient } from "@/features/public-pages/forgot-password-page-client";

export const metadata: Metadata = {
  title: "بازیابی رمز عبور",
  description: "بازیابی امن رمز عبور حساب کاربری هایپرمارکت",
  robots: { index: false, follow: false },
  alternates: { canonical: "/forgot-password" },
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordPageClient />;
}
