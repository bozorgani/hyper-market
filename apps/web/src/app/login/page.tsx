import type { Metadata } from "next";
import { LoginPageClient } from "@/features/public-pages/login-page-client";

export const metadata: Metadata = {
  title: "ورود به حساب",
  description: "ورود به حساب کاربری هایپرمارکت",
  robots: { index: false, follow: false },
  alternates: { canonical: "/login" },
};

export default function LoginPage() {
  return <LoginPageClient />;
}
