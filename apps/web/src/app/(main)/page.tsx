import type { Metadata } from "next";
import { HomePageClient } from "@/features/public-pages/home-page-client";

export const metadata: Metadata = {
  title: "هایپرمارکت | فروشگاه آنلاین",
  description: "خرید آنلاین محصولات هایپرمارکت با تجربه فارسی، ارسال سریع و قیمت مناسب.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <HomePageClient />;
}
