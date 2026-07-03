import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/providers";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  applicationName: "هایپرمارکت",
  title: {
    default: "هایپرمارکت | فروشگاه آنلاین",
    template: "%s | هایپرمارکت",
  },
  description: "رابط کاربری فروشگاهی هایپرمارکت با تجربه فارسی و راست‌به‌چپ",
  openGraph: {
    type: "website",
    locale: "fa_IR",
    siteName: "هایپرمارکت",
    title: "هایپرمارکت | فروشگاه آنلاین",
    description: "رابط کاربری فروشگاهی هایپرمارکت با تجربه فارسی و راست‌به‌چپ",
  },
  twitter: {
    card: "summary_large_image",
    title: "هایپرمارکت | فروشگاه آنلاین",
    description: "رابط کاربری فروشگاهی هایپرمارکت با تجربه فارسی و راست‌به‌چپ",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}