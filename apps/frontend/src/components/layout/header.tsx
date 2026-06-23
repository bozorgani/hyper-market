"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Search, ShoppingCart, UserRound } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { useSearchSuggest } from "@/hooks/use-search";

export function Header() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const suggestions = useSearchSuggest(debouncedQuery);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedQuery = query.trim();
    if (normalizedQuery) {
      router.push(`/search?q=${encodeURIComponent(normalizedQuery)}`);
      setQuery("");
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto grid min-h-16 max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3">
        <Link href="/" className="whitespace-nowrap text-lg font-black text-rose-600">
          هایپرمارکت
        </Link>

        <form onSubmit={submitSearch} className="relative min-w-0">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="جستجو در محصولات..."
            className="h-11 bg-slate-100 pr-10"
          />
          {query.trim().length >= 2 && (
            <div className="absolute right-0 top-12 z-50 max-h-96 w-full overflow-auto rounded-2xl border border-slate-200 bg-white p-2 text-right shadow-xl">
              {suggestions.isLoading ? <p className="p-3 text-sm text-slate-500">در حال جستجو...</p> : null}
              {(suggestions.data ?? []).map((item) => (
                <Link
                  key={item.id}
                  href={`/products/${item.id}`}
                  onClick={() => setQuery("")}
                  className="flex items-center gap-3 rounded-xl p-3 hover:bg-slate-50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">🛍️</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-500">{formatPrice(item.price)}</p>
                  </div>
                </Link>
              ))}
              {suggestions.data?.length === 0 ? <p className="p-3 text-sm text-slate-500">نتیجه‌ای یافت نشد.</p> : null}
            </div>
          )}
        </form>

        <nav className="flex items-center gap-1 text-sm font-medium sm:gap-2">
          <Link href="/products" className="hidden rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-100 sm:inline-flex">
            محصولات
          </Link>
          <Link href="/cart" className="rounded-xl p-2 text-slate-700 hover:bg-slate-100" aria-label="سبد خرید">
            <ShoppingCart size={20} />
          </Link>
          {user ? (
            <>
              <Link href="/profile" className="rounded-xl p-2 text-slate-700 hover:bg-slate-100" aria-label="پروفایل">
                <UserRound size={20} />
              </Link>
              <Button variant="ghost" onClick={logout} className="hidden sm:inline-flex">
                خروج
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button>ورود</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
