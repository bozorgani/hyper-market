import type { Metadata } from "next";
import { VerifyOtpPageClient } from "@/features/public-pages/verify-otp-page-client";

export const metadata: Metadata = {
  title: "تأیید کد",
  description: "تأیید کد یکبار مصرف حساب کاربری",
  robots: { index: false, follow: false },
  alternates: { canonical: "/verify-otp" },
};

export default function VerifyOtpPage() {
  return <VerifyOtpPageClient />;
}
