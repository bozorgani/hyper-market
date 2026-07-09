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
          const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 rounded-xl py-1 transition-all active:scale-[0.96]",
                isActive ? "text-emerald-600 font-bold" : "text-slate-500 hover:text-slate-800"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="relative">
                <Icon className="h-5 w-5" aria-hidden="true" />
                {href === "/cart" && cartCount > 0 && (
                  <span 
                    className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-black text-white ring-2 ring-white px-0.5"
                    aria-label={`${cartCount} مورد در سبد خرید`}
                  >
                    {cartCount > 9 ? "۹+" : cartCount.toLocaleString("fa-IR")}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium tracking-tight">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
