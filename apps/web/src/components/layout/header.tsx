"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ShoppingCart, UserRound, MapPin, X, ChevronLeft, Menu
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useDebounce } from "@/hooks/use-debounce";
import { useSearchSuggest } from "@/hooks/use-search";
import { useCart } from "@/hooks/use-cart";
import { formatPrice } from "@/lib/utils";
import { getProductImageUrl } from "@/lib/image-utils";
import { useAuthStore } from "@/store/auth-store";

function isCustomerRole(role?: string) {
  return role === "customer" || role === "CUSTOMER";
}

export function Header() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { showToast } = useToast();
  const isCustomer = isCustomerRole(user?.role);
  const cart = useCart(isCustomer);
  const cartCount = isCustomer ? (cart.data?.items ?? []).length : 0;
  const [query, setQuery] = useState("");
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchRef = useRef<HTMLFormElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);
  const suggestions = useSearchSuggest(debouncedQuery);
  const suggestionItems = suggestions.data ?? [];
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSuggestOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsSuggestOpen(false);
        setMobileSearchOpen(false);
        setMobileMenuOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (mobileSearchOpen && mobileSearchRef.current) mobileSearchRef.current.focus();
  }, [mobileSearchOpen]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSuggestOpen(false);
    setMobileSearchOpen(false);
    setMobileMenuOpen(false);
    const normalizedQuery = query.trim();
    router.push(normalizedQuery ? `/search?q=${encodeURIComponent(normalizedQuery)}` : "/search");
    setQuery("");
  }

  function selectSuggestion(index: number) {
    const item = suggestionItems[index];
    if (!item) return;
    setQuery("");
    setIsSuggestOpen(false);
    setMobileSearchOpen(false);
    router.push(`/products/${item.id}`);
  }

  function handleSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (!showSuggestPanel || suggestionItems.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestionIndex((index) => (index + 1) % suggestionItems.length);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestionIndex((index) => index <= 0 ? suggestionItems.length - 1 : index - 1);
    }
    if (event.key === "Enter" && activeSuggestionIndex >= 0) {
      event.preventDefault();
      selectSuggestion(activeSuggestionIndex);
    }
  }

  function handleLogout() {
    void logout();
    showToast({ type: "info", title: "از حساب کاربری خارج شدید" });
    setMobileMenuOpen(false);
  }

  const showSuggestPanel = isSuggestOpen && query.trim().length >= 2;
  const listboxId = "header-search-listbox";
  const inputId = "header-search-input";
  const activeOptionId =
    activeSuggestionIndex >= 0
      ? `header-search-option-${activeSuggestionIndex}`
      : undefined;

  const suggestContent = (
    <div
      id={listboxId}
      className="absolute right-0 top-full z-50 mt-1.5 w-full max-h-[340px] overflow-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl text-sm"
      role="listbox"
      aria-label="پیشنهادهای جستجو"
    >
      {suggestions.isLoading ? <p className="p-3 text-slate-500" role="status" aria-live="polite">در حال جستجو...</p> : null}
      {!suggestions.isLoading && suggestionItems.map((item, index) => {
        const optionId = `header-search-option-${index}`;
        const isActive = activeSuggestionIndex === index;
        return (
        <Link
          key={item.id}
          id={optionId}
          role="option"
          aria-selected={isActive}
          href={`/products/${item.id}`}
          onClick={() => { setQuery(""); setIsSuggestOpen(false); setMobileSearchOpen(false); }}
          onMouseEnter={() => setActiveSuggestionIndex(index)}
          className={`flex items-center gap-3 rounded-xl p-3 hover:bg-slate-50 ${isActive ? "bg-emerald-50 ring-1 ring-emerald-100" : ""}`}
        >
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-slate-100">
            {item.images?.[0] ? <Image src={getProductImageUrl(item.images[0])} alt="" width={36} height={36} className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-lg" aria-hidden="true">🛍️</span>}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-slate-900">{item.name}</p>
            <p className="text-xs text-emerald-600 font-medium">{formatPrice(item.price)}</p>
          </div>
        </Link>
      )})}
      {!suggestions.isLoading && suggestionItems.length === 0 && <p className="p-3 text-xs text-slate-500" role="status">نتیجه‌ای یافت نشد.</p>}
      <button type="submit" className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200">
        مشاهده همه نتایج <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-100">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center gap-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-md text-white font-black text-base">H</div>
            <div className="hidden sm:block">
              <p className="text-sm font-black text-slate-900 leading-none">هایپرمارکت</p>
              <p className="text-[10px] text-emerald-600 font-medium tracking-wide">همه چیز برای همه</p>
            </div>
          </Link>

          {/* Desktop Search */}
          <form ref={searchRef} onSubmit={submitSearch} className="relative hidden flex-1 md:block max-w-lg">
            <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              id={inputId}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setIsSuggestOpen(e.target.value.trim().length >= 2); setActiveSuggestionIndex(-1); }}
              onFocus={() => { if (query.trim().length >= 2) setIsSuggestOpen(true); }}
              onKeyDown={handleSearchKeyDown}
              role="combobox"
              aria-label="جستجو در محصولات"
              aria-expanded={showSuggestPanel}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-haspopup="listbox"
              aria-activedescendant={activeOptionId}
              placeholder="جستجو در محصولات..."
              autoComplete="off"
              className="h-10 bg-slate-50 pr-11 rounded-2xl border-slate-200 focus:bg-white"
            />
            {showSuggestPanel && suggestContent}
          </form>

          <div className="flex-1 md:hidden" />

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1 text-sm">
            <Link href="/products" className="px-4 py-2 font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition">محصولات</Link>
            {user && <Link href="/orders" className="px-4 py-2 font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition">سفارش‌ها</Link>}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button onClick={() => setMobileSearchOpen(true)} className="md:hidden flex h-10 w-10 items-center justify-center rounded-2xl text-slate-600 hover:bg-slate-50" aria-label="جستجو">
              <Search className="h-5 w-5" />
            </button>

            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 bg-slate-50 rounded-xl">
              <MapPin className="h-3.5 w-3.5 text-emerald-500" /> ارسال به آدرس شما
            </div>

            <Link href="/cart" className="relative flex h-10 w-10 items-center justify-center rounded-2xl text-slate-600 hover:bg-slate-50 transition" aria-label="سبد خرید">
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white shadow ring-1 ring-white">{cartCount > 9 ? "۹+" : cartCount}</span>}
            </Link>

            {user ? (
              <Link href="/profile" className="flex h-10 w-10 items-center justify-center rounded-2xl text-slate-600 hover:bg-slate-50" aria-label="پروفایل">
                <UserRound className="h-5 w-5" />
              </Link>
            ) : (
              <Link href="/login">
                <button className="flex h-9 items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700">ورود / ثبت‌نام</button>
              </Link>
            )}

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden ml-1 flex h-10 w-10 items-center justify-center rounded-2xl text-slate-600 hover:bg-slate-50" aria-label="منو">
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Search */}
      <AnimatePresence>
        {mobileSearchOpen && (
          <motion.div initial={{opacity:0, y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} className="md:hidden absolute inset-x-0 top-0 z-50 bg-white border-b shadow px-4 py-3">
            <form onSubmit={submitSearch} className="relative">
              <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input ref={mobileSearchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جستجو..." className="h-11 w-full rounded-2xl border bg-slate-50 pr-12 pl-10 text-sm" />
              <button type="button" onClick={() => {setMobileSearchOpen(false); setQuery("");}} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"><X className="h-4 w-4" /></button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-[60] bg-black/40" onClick={() => setMobileMenuOpen(false)}>
            <motion.div initial={{ x: 120 }} animate={{ x: 0 }} exit={{ x: 120 }} className="absolute right-0 top-0 h-full w-72 bg-white shadow-xl px-5 py-8 text-sm" onClick={e => e.stopPropagation()}>
              <div className="space-y-1">
                <Link href="/products" className="block py-3 px-3 rounded-xl hover:bg-slate-100" onClick={() => setMobileMenuOpen(false)}>محصولات</Link>
                {user && <Link href="/orders" className="block py-3 px-3 rounded-xl hover:bg-slate-100" onClick={() => setMobileMenuOpen(false)}>سفارش‌ها</Link>}
                <Link href="/profile" className="block py-3 px-3 rounded-xl hover:bg-slate-100" onClick={() => setMobileMenuOpen(false)}>پروفایل</Link>
                {user ? (
                  <button onClick={handleLogout} className="w-full text-left py-3 px-3 text-red-600 rounded-xl hover:bg-red-50">خروج</button>
                ) : (
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block py-3 px-3 rounded-xl bg-emerald-600 text-white text-center">ورود</Link>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
}
