import type { Metadata } from "next";
import { ProfileAddressesPageClient } from "@/features/public-pages/profile-addresses-page-client";

export const metadata: Metadata = {
  title: "آدرس‌های من",
  description: "مدیریت آدرس‌های تحویل در هایپرمارکت.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/profile/addresses" },
};

export default function ProfileAddressesPage() {
  return <ProfileAddressesPageClient />;
}
