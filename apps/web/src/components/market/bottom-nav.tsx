"use client";

import { motion } from "framer-motion";
import { Home, Grid3X3, ShoppingCart, UserRound } from "lucide-react";
import { useMarketStore, type Page } from "@/store/market-store";

const tabs: { type: Page["type"]; label: string; icon: typeof Home }[] = [
  { type: "home", label: "خانه", icon: Home },
  { type: "products", label: "دسته‌بندی", icon: Grid3X3 },
  { type: "cart", label: "سبد خرید", icon: ShoppingCart },
  { type: "profile", label: "حساب من", icon: UserRound },
];

export function BottomNav() {
  const { currentPage, navigate, getCartCount } = useMarketStore();
  const cartCount = getCartCount();

  const hidden =
    currentPage.type === "product-detail" ||
    currentPage.type === "checkout" ||
    currentPage.type === "cart";

  if (hidden) return null;

  // After hiding cart/checkout/product-detail, remaining types are: home, products, profile
  const activeType = currentPage.type === "profile" ? "profile" : currentPage.type;

  return (
    <nav className="glass-dark fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/60">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2 pb-safe">
        {tabs.map(({ type, label, icon: Icon }) => {
          const isActive = activeType === type;
          return (
            <button
              key={type}
              onClick={() => navigate({ type } as Page)}
              className="relative flex flex-col items-center gap-0.5 rounded-xl px-4 py-1.5 transition-colors"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-x-2 -top-1 h-1 rounded-full bg-emerald-500"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <div className="relative">
                <Icon size={22} className={isActive ? "text-emerald-600" : "text-slate-400"} />
                {type === "cart" && cartCount > 0 && (
                  <span className="absolute -top-1.5 -left-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
                    {cartCount > 9 ? "۹+" : cartCount.toLocaleString("fa-IR")}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-semibold ${isActive ? "text-emerald-600" : "text-slate-400"}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}