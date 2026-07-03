"use client";
import { Header } from "@/components/market/header";
import { BottomNav } from "@/components/market/bottom-nav";
export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return (<><Header /><main>{children}</main><BottomNav /></>);
}