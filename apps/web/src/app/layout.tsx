import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import "./leaflet.css";
import { Providers } from "@/providers";
import { serializeJsonLd } from "@/lib/structured-data";

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
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "هایپرمارکت",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "هایپرمارکت | فروشگاه آنلاین",
    description: "رابط کاربری فروشگاهی هایپرمارکت با تجربه فارسی و راست‌به‌چپ",
    images: ["/og-image.jpg"],
  },
  robots: { index: true, follow: true },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  // CSP nonce from proxy – Issue #17
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  const organizationLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}#organization`,
    name: "هایپرمارکت",
    alternateName: "HyperMarket",
    url: siteUrl,
    logo: `${siteUrl}/og-image.jpg`,
  };

  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}#website`,
    url: siteUrl,
    name: "هایپرمارکت | فروشگاه آنلاین",
    alternateName: "HyperMarket",
    publisher: {
      "@type": "Organization",
      "@id": `${siteUrl}#organization`,
    },
    inLanguage: "fa",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <head>
        {/* Hreflang tags for Persian content – Task 18 */}
        <link rel="alternate" hrefLang="fa" href={siteUrl} />
        <link rel="alternate" hrefLang="x-default" href={siteUrl} />
      </head>
      <body className={`${vazirmatn.className} min-h-screen bg-background text-foreground antialiased`}>
        {/* Skip-to-content link for keyboard users – Task 1 */}
        <a
          href="#main-content"
          className="pointer-events-none absolute -top-40 right-4 z-[100] rounded-2xl bg-rose-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all focus:pointer-events-auto focus:top-4 focus:outline-none focus:ring-4 focus:ring-rose-200"
        >
          پرش به محتوای اصلی
        </a>
        {/* JSON-LD Structured Data – Organization + WebSite */}
        <script
          type="application/ld+json"
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(organizationLd) }}
        />
        <script
          type="application/ld+json"
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(websiteLd) }}
        />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}