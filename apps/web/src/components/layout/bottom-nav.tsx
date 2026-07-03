"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Grid2x2, ShoppingCart, UserRound } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "خانه", icon: Home, matchExact: true },
  { href: "/products", label: "دسته‌بندی", icon: Grid2x2 },
  { href: "/cart", label: "سبد خرید", icon: ShoppingCart },
  { href: "/profile", label: "پروفایل", icon: UserRound },
];

export function BottomNav() {
  const pathname = usePathname();
  const cart = useCart();
  const cartCount = (cart.data?.items ?? []).length;

  // Hide on admin pages, auth pages, and some other pages
  const hidden = pathname.startsWith("/admin") || pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/verify-otp");

  if (hidden) return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-lg lg:hidden">
      <div className="flex items-center justify-around py-1 pb-[max(env(safe-area-inset-bottom,0px),6px)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.matchExact ? pathname === tab.href : pathname.startsWith(tab.href);
          const isCart = tab.href === "/cart";

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "relative flex flex-col items-center gap-0.5 px-3 py-2 transition",
                isActive ? "text-emerald-600" : "text-slate-400",
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                {isCart && cartCount > 0 && (
                  <span className="absolute -top-2 -left-2 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold">{tab.label}</span>
              {isActive && (
                <div className="absolute -top-px left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-emerald-500" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}