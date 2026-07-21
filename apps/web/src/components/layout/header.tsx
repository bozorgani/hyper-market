"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Search, ShoppingCart, UserRound, MapPin, Menu,
} from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { isCustomerRole } from "@/lib/auth";
import { useAuthStore } from "@/store/auth-store";
import { DesktopSearch } from "./desktop-search";
import { MobileSearchOverlay } from "./mobile-search-overlay";
import { MobileMenu } from "./mobile-menu";
import { LinkButton } from "@/components/ui/link-button";

export function Header() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isCustomer = isCustomerRole(user?.role);
  const cart = useCart(isCustomer);
  const cartItems = cart.data?.items ?? [];
  const cartCount = isCustomer
    ? cartItems.reduce((sum, item) => sum + (item.quantity ?? 0), 0)
    : 0;

  const previousCartCount = useRef<number | null>(null);
  const [cartCountPulse, setCartCountPulse] = useState(false);
  const [query, setQuery] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (previousCartCount.current === null) {
      previousCartCount.current = cartCount;
      return;
    }
    if (cartCount > previousCartCount.current) {
      setCartCountPulse(true);
      const timeout = window.setTimeout(() => setCartCountPulse(false), 450);
      previousCartCount.current = cartCount;
      return () => window.clearTimeout(timeout);
    }
    previousCartCount.current = cartCount;
  }, [cartCount]);

  // Global Escape key handler for mobile overlays
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileSearchOpen(false);
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleMobileSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMobileSearchOpen(false);
    setMobileMenuOpen(false);
    const normalizedQuery = query.trim();
    router.push(normalizedQuery ? `/search?q=${encodeURIComponent(normalizedQuery)}` : "/search");
    setQuery("");
  }

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-100">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center gap-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 shadow-md text-white font-black text-base">H</div>
            <div className="hidden sm:block">
              <p className="text-sm font-black text-slate-900 leading-none">هایپرمارکت</p>
              <p className="text-[10px] text-rose-600 font-medium tracking-wide">همه چیز برای همه</p>
            </div>
          </Link>

          {/* Desktop Search — extracted */}
          <DesktopSearch />

          <div className="flex-1 md:hidden" />

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1 text-sm">
            <Link href="/products" className="px-4 py-2 font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition">محصولات</Link>
            {user && <Link href="/orders" className="px-4 py-2 font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition">سفارش‌ها</Link>}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button onClick={() => setMobileSearchOpen(true)} className="md:hidden flex h-10 w-10 items-center justify-center rounded-2xl text-slate-600 hover:bg-slate-50" aria-label="جستجو"
              title="جستجو در محصولات">
              <Search className="h-5 w-5" />
            </button>

            {user ? (
              <Link
                href="/profile/addresses"
                className="hidden lg:flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-700"
                aria-label="مدیریت آدرس‌ها"
                title="مدیریت آدرس‌های ارسال"
              >
                <MapPin className="h-3.5 w-3.5 text-rose-500" /> آدرس‌های من
              </Link>
            ) : (
              <div className="hidden items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 lg:flex" title="مقصد ارسال سفارش">
                <MapPin className="h-3.5 w-3.5 text-rose-500" /> ارسال به آدرس شما
              </div>
            )}

            <Link
              href="/cart"
              className="relative flex h-10 w-10 items-center justify-center gap-2 rounded-2xl text-slate-600 transition hover:bg-slate-50 lg:w-auto lg:px-3"
              aria-label={cartCount > 0 ? `سبد خرید، ${cartCount} عدد کالا` : "سبد خرید"}
            >
              <ShoppingCart className="h-5 w-5" aria-hidden="true" />
              <span className="hidden text-xs font-bold text-slate-700 lg:inline">سبد خرید</span>
              {cartCount > 0 && (
                <span className="hidden text-[10px] font-medium text-slate-400 lg:inline">
                  ({cartCount.toLocaleString("fa-IR")})
                </span>
              )}
              {cartCount > 0 && (
                <span
                  className={`absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow ring-1 ring-white px-1 ${cartCountPulse ? "cart-badge-pop" : ""}`}
                  aria-label={`${cartCount} مورد در سبد خرید`}
                >
                  {cartCount > 9 ? "۹+" : cartCount.toLocaleString("fa-IR")}
                </span>
              )}
            </Link>

            {user ? (
              <Link href="/profile" className="flex h-10 w-10 items-center justify-center rounded-2xl text-slate-600 hover:bg-slate-50" aria-label="پروفایل">
                <UserRound className="h-5 w-5" />
              </Link>
            ) : (
              <LinkButton href="/login" size="sm" className="rounded-2xl text-xs">ورود / ثبت‌نام</LinkButton>
            )}

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden ml-1 flex h-10 w-10 items-center justify-center rounded-2xl text-slate-600 hover:bg-slate-50" aria-label="منوی اصلی"
              aria-expanded={mobileMenuOpen}>
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Search — extracted */}
      <MobileSearchOverlay
        open={mobileSearchOpen}
        query={query}
        onQueryChange={setQuery}
        onSubmit={handleMobileSearchSubmit}
        onClose={() => { setMobileSearchOpen(false); setQuery(""); }}
      />

      {/* Mobile Menu — extracted with focus trap */}
      <MobileMenu
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
    </header>
  );
}
