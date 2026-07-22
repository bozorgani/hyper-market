"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { cn } from "@/lib/utils";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isCheckout = pathname.startsWith("/checkout");

  return (
    <>
      <Header />
      <main id="main-content" className={cn("animate-fade-in", isCheckout ? "pb-0" : "pb-main-nav")}>
        {children}
      </main>
      {isCheckout ? null : <BottomNav />}
    </>
  );
}