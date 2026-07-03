"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Search, ShoppingCart, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useDebounce } from "@/hooks/use-debounce";
import { useSearchSuggest } from "@/hooks/use-search";
import { formatPrice } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

export function Header() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const searchRef = useRef<HTMLFormElement>(null);
  const debouncedQuery = useDebounce(query, 300);
  const suggestions = useSearchSuggest(debouncedQuery);

  // Close the suggestions panel on outside click or Escape.
  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSuggestOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsSuggestOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSuggestOpen(false);
    const normalizedQuery = query.trim();
    router.push(normalizedQuery ? `/search?q=${encodeURIComponent(normalizedQuery)}` : "/search");
    setQuery("");
  }

  function handleLogout() {
    void logout();
    showToast({ type: "info", title: "از حساب کاربری خارج شدید" });
  }

  const showSuggestPanel = isSuggestOpen && query.trim().length >= 2;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto grid min-h-16 max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3">
        <Link href="/" className="whitespace-nowrap text-lg font-black text-rose-600">
          هایپرمارکت
        </Link>

        <form ref={searchRef} onSubmit={submitSearch} className="relative min-w-0">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setIsSuggestOpen(event.target.value.trim().length >= 2);
            }}
            placeholder="جستجو در محصولات..."
            className="h-11 bg-slate-100 pr-10"
          />
          {showSuggestPanel ? (
            <div className="absolute right-0 top-12 z-50 max-h-96 w-full overflow-auto rounded-2xl border border-slate-200 bg-white p-2 text-right shadow-xl">
              {suggestions.isLoading ? <p className="p-3 text-sm text-slate-500">در حال جستجوی پیشنهادها...</p> : null}
              {!suggestions.isLoading && suggestions.isError ? <p className="p-3 text-sm text-red-500">پیشنهادهای جستجو در دسترس نیست.</p> : null}
              {!suggestions.isLoading && !suggestions.isError && (suggestions.data ?? []).map((item) => (
                <Link
                  key={item.id}
                  href={`/products/${item.id}`}
                  onClick={() => {
                    setQuery("");
                    setIsSuggestOpen(false);
                  }}
                  className="flex items-center gap-3 rounded-xl p-3 hover:bg-slate-50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">🛍️</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">{formatPrice(item.price)}</p>
                  </div>
                </Link>
              ))}
              {!suggestions.isLoading && !suggestions.isError && suggestions.data?.length === 0 ? <p className="p-3 text-sm text-slate-500">نتیجه‌ای یافت نشد.</p> : null}
              <button
                type="submit"
                className="mt-2 flex w-full items-center justify-center rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                مشاهده نتایج کامل جستجو
              </button>
            </div>
          ) : null}
        </form>

        <nav className="flex items-center gap-1 text-sm font-medium sm:gap-2">
          <Link href="/products" className="hidden rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-100 sm:inline-flex">
            محصولات
          </Link>
          {user ? (
            <Link href="/orders" className="hidden rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-100 lg:inline-flex">
              سفارش‌های من
            </Link>
          ) : null}
          <Link href="/cart" className="rounded-xl p-2 text-slate-700 hover:bg-slate-100" aria-label="سبد خرید">
            <ShoppingCart size={20} />
          </Link>
          {user ? (
            <>
              <Link href="/profile" className="rounded-xl p-2 text-slate-700 hover:bg-slate-100" aria-label="پروفایل">
                <UserRound size={20} />
              </Link>
              <Button type="button" variant="ghost" onClick={handleLogout} className="hidden sm:inline-flex">
                خروج
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button type="button">ورود</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
