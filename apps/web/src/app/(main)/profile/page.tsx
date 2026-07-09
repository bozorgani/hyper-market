import type { Metadata } from "next";
import { ProfilePageClient } from "@/features/public-pages/profile-page-client";

export const metadata: Metadata = {
  title: "پروفایل کاربری",
  description: "مدیریت اطلاعات حساب کاربری در هایپرمارکت.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/profile" },
};

export default function ProfilePage() {
  return <ProfilePageClient />;
}
