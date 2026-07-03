"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingCart, UserRound, Package } from "lucide-react";

const navItems = [
  { href: "/", label: "خانه", icon: Home },
  { href: "/products", label: "محصولات", icon: Package },
  { href: "/cart", label: "سبد", icon: ShoppingCart },
  { href: "/profile", label: "حساب", icon: UserRound },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-around px-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link key={href} href={href} className={`flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-semibold transition-colors ${active ? "text-rose-600" : "text-slate-400"}`}>
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}