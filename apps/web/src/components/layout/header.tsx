"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ShoppingCart,
  UserRound,
  MapPin,
  X,
  ChevronLeft,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useDebounce } from "@/hooks/use-debounce";
import { useSearchSuggest } from "@/hooks/use-search";
import { useCart } from "@/hooks/use-cart";
import { formatPrice } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

export function Header() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { showToast } = useToast();
  const cart = useCart(Boolean(user));
  const cartCount = user ? (cart.data?.items ?? []).length : 0;
  const [query, setQuery] = useState("");
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchRef = useRef<HTMLFormElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);
  const suggestions = useSearchSuggest(debouncedQuery);
  const suggestionItems = suggestions.data ?? [];
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const suggestListId = "header-search-suggestions";

  // Close suggestions on outside click
  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsSuggestOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsSuggestOpen(false);
        setMobileSearchOpen(false);
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

  // Auto-focus mobile search
  useEffect(() => {
    if (mobileSearchOpen && mobileSearchRef.current) {
      mobileSearchRef.current.focus();
    }
  }, [mobileSearchOpen]);


  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSuggestOpen(false);
    setMobileSearchOpen(false);
    const normalizedQuery = query.trim();
    router.push(
      normalizedQuery
        ? `/search?q=${encodeURIComponent(normalizedQuery)}`
        : "/search",
    );
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
      setActiveSuggestionIndex((index) =>
        index <= 0 ? suggestionItems.length - 1 : index - 1,
      );
    }

    if (event.key === "Enter" && activeSuggestionIndex >= 0) {
      event.preventDefault();
      selectSuggestion(activeSuggestionIndex);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function handleLogout() {
    void logout();
    showToast({ type: "info", title: "از حساب کاربری خارج شدید" });
  }

  const showSuggestPanel = isSuggestOpen && query.trim().length >= 2;

  const suggestContent = (
    <div
      id={suggestListId}
      role="listbox"
      aria-label="پیشنهادهای جستجو"
      className="absolute right-0 top-full mt-1 z-50 max-h-80 w-full overflow-auto rounded-2xl border border-slate-200 bg-white p-2 text-right shadow-xl"
    >
      {suggestions.isLoading ? (
        <p className="p-3 text-sm text-slate-500">در حال جستجو...</p>
      ) : null}
      {!suggestions.isLoading &&
        !suggestions.isError &&
        suggestionItems.map((item, index) => (
          <Link
            id={`header-search-option-${index}`}
            role="option"
            aria-selected={activeSuggestionIndex === index}
            key={item.id}
            href={`/products/${item.id}`}
            onMouseEnter={() => setActiveSuggestionIndex(index)}
            onClick={() => {
              setQuery("");
              setIsSuggestOpen(false);
              setMobileSearchOpen(false);
            }}
            className={`flex items-center gap-3 rounded-xl p-3 transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-200 ${activeSuggestionIndex === index ? "bg-emerald-50" : ""}`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
              {item.images?.[0] ? (
                <Image
                  src={item.images[0]}
                  alt=""
                  width={40}
                  height={40}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-lg">🛍️</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-900">
                {item.name}
              </p>
              <p className="text-xs text-slate-500">
                {formatPrice(item.price)}
              </p>
            </div>
          </Link>
        ))}
      {!suggestions.isLoading &&
        !suggestions.isError &&
        suggestions.data?.length === 0 && (
          <p className="p-3 text-sm text-slate-500">نتیجه‌ای یافت نشد.</p>
        )}
      <button
        type="submit"
        className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
      >
        مشاهده نتایج کامل
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-lg border-b border-slate-100">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center gap-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-md shadow-emerald-200">
              <span className="text-base font-black text-white">H</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-black text-slate-900 leading-none">
                هایپرمارکت
              </p>
              <p className="text-[10px] text-emerald-600 font-medium">
                همه چیز برای همه
              </p>
            </div>
          </Link>

          {/* Desktop Search */}
          <form
            ref={searchRef}
            onSubmit={submitSearch}
            className="relative hidden flex-1 md:block"
          >
            <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setIsSuggestOpen(event.target.value.trim().length >= 2);
                setActiveSuggestionIndex(-1);
              }}
              onFocus={() => {
                if (query.trim().length >= 2) setIsSuggestOpen(true);
              }}
              onKeyDown={handleSearchKeyDown}
              role="combobox"
              aria-label="جستجو در محصولات"
              aria-expanded={showSuggestPanel}
              aria-controls={suggestListId}
              aria-activedescendant={
                activeSuggestionIndex >= 0
                  ? `header-search-option-${activeSuggestionIndex}`
                  : undefined
              }
              autoComplete="off"
              placeholder="جستجو در محصولات..."
              className="h-10 bg-slate-50 border-slate-200 pr-10 rounded-xl focus:bg-white focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
            />
            {showSuggestPanel && suggestContent}
          </form>

          {/* Spacer */}
          <div className="flex-1 md:hidden" />

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-1 lg:flex">
            <Link
              href="/products"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              محصولات
            </Link>
            {user ? (
              <Link
                href="/orders"
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              >
                سفارش‌ها
              </Link>
            ) : null}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-1">
            {/* Mobile Search Toggle */}
            <button
              type="button"
              aria-label="باز کردن جستجو"
              onClick={() => setMobileSearchOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-emerald-100 md:hidden"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Location hint - desktop */}
            <div className="hidden lg:flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-50 transition cursor-pointer">
              <MapPin className="h-3.5 w-3.5 text-emerald-500" />
              <span>ارسال به آدرس شما</span>
            </div>

            {/* Cart */}
            <Link
              href="/cart"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-50"
              aria-label="سبد خرید"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -left-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white shadow-sm">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>

            {/* User */}
            {user ? (
              <Link
                href="/profile"
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-50"
                aria-label="پروفایل"
              >
                <UserRound className="h-5 w-5" />
              </Link>
            ) : (
              <Link href="/login">
                <button
                  type="button"
                  className="flex h-9 items-center gap-1.5 rounded-lg bg-emerald-500 px-4 text-xs font-bold text-white shadow-sm shadow-emerald-200 transition hover:bg-emerald-600 focus-visible:ring-4 focus-visible:ring-emerald-100"
                >
                  ورود
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* Delivery Banner - Desktop */}
        <div className="hidden lg:flex items-center gap-4 border-t border-slate-50 py-2 -mx-4 px-4 overflow-x-auto scrollbar-hide">
          {[
            "ارسال سریع",
            "تضمین اصالت کالا",
            "بازگشت تا ۷ روز",
            "پرداخت امن",
          ].map((text) => (
            <span
              key={text}
              className="shrink-0 text-[11px] text-slate-400 font-medium"
            >
              {text}
            </span>
          ))}
        </div>
      </div>

      {/* Mobile Search Overlay */}
      <AnimatePresence>
        {mobileSearchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute inset-x-0 top-0 z-50 border-b border-slate-200 bg-white px-4 py-3 shadow-lg md:hidden"
          >
            <form onSubmit={submitSearch} className="relative">
              <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={mobileSearchRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveSuggestionIndex(-1);
                }}
                placeholder="جستجو در محصولات..."
                aria-label="جستجو در محصولات"
                role="searchbox"
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pr-10 pl-10 text-right text-sm outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
              />
              <button
                type="button"
                aria-label="بستن جستجو"
                onClick={() => {
                  setMobileSearchOpen(false);
                  setQuery("");
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-emerald-200"
              >
                <X className="h-4 w-4" />
              </button>
            </form>
            {query.trim().length >= 2 && (
              <div className="mt-2 max-h-72 overflow-auto rounded-xl border border-slate-200 bg-white">
                {suggestions.isLoading && (
                  <p className="p-3 text-sm text-slate-500">در حال جستجو...</p>
                )}
                {!suggestions.isLoading &&
                  (suggestions.data ?? []).map((item) => (
                    <Link
                      key={item.id}
                      href={`/products/${item.id}`}
                      onClick={() => {
                        setQuery("");
                        setMobileSearchOpen(false);
                      }}
                      className="flex items-center gap-3 p-3 transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-200"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                        {item.images?.[0] ? (
                          <Image
                            src={item.images[0]}
                            alt=""
                            width={36}
                            height={36}
                            unoptimized
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-sm">🛍️</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {item.name}
                        </p>
                        <p className="text-xs text-emerald-600 font-medium">
                          {formatPrice(item.price)}
                        </p>
                      </div>
                    </Link>
                  ))}
                {!suggestions.isLoading && suggestions.data?.length === 0 && (
                  <p className="p-3 text-sm text-slate-500">
                    نتیجه‌ای یافت نشد.
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
