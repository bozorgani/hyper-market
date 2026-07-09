import type { Metadata } from "next";
import { WishlistPageClient } from "@/features/public-pages/wishlist-page-client";

export const metadata: Metadata = {
  title: "علاقه‌مندی‌ها",
  description: "لیست محصولات مورد علاقه شما در هایپرمارکت.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/wishlist" },
};

export default function WishlistPage() {
  return <WishlistPageClient />;
}
