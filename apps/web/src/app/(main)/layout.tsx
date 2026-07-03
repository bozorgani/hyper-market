"use client";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (<><Header />{children}<BottomNav /></>);
}