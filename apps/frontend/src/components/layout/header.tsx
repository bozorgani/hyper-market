"use client";

import Link from "next/link";
import { ShoppingCart, UserRound } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";

export function Header() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
        <Link href="/" className="whitespace-nowrap text-lg font-black text-rose-600">
          هایپرمارکت
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium sm:gap-2">
          <Link href="/products" className="rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-100">
            محصولات
          </Link>
          <Link href="/cart" className="rounded-xl p-2 text-slate-700 hover:bg-slate-100" aria-label="سبد خرید">
            <ShoppingCart size={20} />
          </Link>
          {user ? (
            <>
              <Link href="/profile" className="rounded-xl p-2 text-slate-700 hover:bg-slate-100" aria-label="پروفایل">
                <UserRound size={20} />
              </Link>
              <Button variant="ghost" onClick={logout} className="hidden sm:inline-flex">
                خروج
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button>ورود</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
