import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Providers } from "@/providers";

export const metadata: Metadata = {
  title: "هایپرمارکت | فروشگاه آنلاین",
  description: "رابط کاربری فروشگاهی هایپرمارکت با تجربه فارسی و راست‌به‌چپ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-screen bg-slate-50 text-right text-slate-950 antialiased">
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}
