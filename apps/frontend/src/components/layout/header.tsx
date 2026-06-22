"use client";

import Link from "next/link";
import { ShoppingCart, UserRound } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";

export function Header() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-black text-rose-600">HyperMarket</Link>
        <nav className="flex items-center gap-2 text-sm font-medium">
          <Link href="/products" className="rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-100">Products</Link>
          <Link href="/cart" className="rounded-xl p-2 text-slate-700 hover:bg-slate-100" aria-label="Cart"><ShoppingCart size={20} /></Link>
          {user ? (
            <>
              <Link href="/profile" className="rounded-xl p-2 text-slate-700 hover:bg-slate-100" aria-label="Profile"><UserRound size={20} /></Link>
              <Button variant="ghost" onClick={logout}>Logout</Button>
            </>
          ) : (
            <Link href="/login"><Button>Login</Button></Link>
          )}
        </nav>
      </div>
    </header>
  );
}
