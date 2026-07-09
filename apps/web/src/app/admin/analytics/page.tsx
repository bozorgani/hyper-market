import type { Metadata } from "next";
import { AdminAnalyticsClient } from "@/features/admin/analytics-client";

export const metadata: Metadata = {
  title: "آنالیتیکس | پنل مدیریت",
  description: "مدیریت آنالیتیکس در پنل ادمین هایپرمارکت",
  robots: { index: false, follow: false },
};

export default function AdminAnalyticsPage() {
  return <AdminAnalyticsClient />;
}
