import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
  variable: "--font-vazirmatn",
  preload: true,
});

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
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body className={`${vazirmatn.className} min-h-screen bg-background text-foreground antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}