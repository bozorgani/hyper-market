"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, ShoppingCart, UserRound, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { isCustomerRole } from "@/lib/auth";
import { useCart } from "@/hooks/use-cart";
import { useAuthStore } from "@/store/auth-store";

const navItems = [
  { href: "/", label: "خانه", icon: Home },
  { href: "/products", label: "محصولات", icon: ShoppingBag },
  { href: "/search", label: "جستجو", icon: Search },
  { href: "/cart", label: "سبد", icon: ShoppingCart },
  { href: "/profile", label: "حساب", icon: UserRound },
];

export function BottomNav() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isCustomer = isCustomerRole(user?.role);
  const cart = useCart(isCustomer);
  const cartItems = cart.data?.items ?? [];
  const cartCount = isCustomer
    ? cartItems.reduce((sum, item) => sum + (item.quantity ?? 0), 0)
    : 0;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-xl md:hidden pb-safe">
      <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-1 text-xs">
        {navItems.map(({ href, label, icon: Icon }) => {
          const resolvedHref = href === "/profile" && !user ? "/login" : href;
          const resolvedLabel = href === "/profile" && !user ? "ورود" : label;
          const isActive = pathname === resolvedHref || (resolvedHref !== "/" && pathname.startsWith(resolvedHref));
          return (
            <Link
              key={href}
              href={resolvedHref}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 rounded-2xl py-1 transition-all active:scale-[0.96]",
                isActive
                  ? "bg-rose-50 text-rose-700 font-bold shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="relative">
                <Icon className={cn("h-5 w-5 transition-transform", isActive && "scale-105")} aria-hidden="true" />
                {href === "/cart" && cartCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-0.5 text-[9px] font-black text-white ring-2 ring-white"
                    aria-label={`${cartCount} مورد در سبد خرید`}
                  >
                    {cartCount > 9 ? "۹+" : cartCount.toLocaleString("fa-IR")}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium tracking-tight">{resolvedLabel}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
