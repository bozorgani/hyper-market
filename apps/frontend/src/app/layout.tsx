import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Providers } from "@/providers";

export const metadata: Metadata = {
  title: "Hyper Market",
  description: "Fast ecommerce frontend for Hyper Market",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-950 antialiased">
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}
