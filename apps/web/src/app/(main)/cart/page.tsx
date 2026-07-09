import type { Metadata } from "next";
import { CartPageClient } from "@/features/public-pages/cart-page-client";

export const metadata: Metadata = {
  title: "سبد خرید",
  description: "مشاهده و مدیریت سبد خرید هایپرمارکت، تغییر تعداد کالاها و ادامه فرآیند پرداخت.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/cart" },
  openGraph: {
    title: "سبد خرید | هایپرمارکت",
    description: "مدیریت سبد خرید و ادامه فرآیند پرداخت در هایپرمارکت.",
    type: "website",
    url: "/cart",
  },
};

export default function CartPage() {
  return <CartPageClient />;
}
