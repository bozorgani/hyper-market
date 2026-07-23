"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, ShoppingBag, Home, ArrowLeft } from "lucide-react";
import { LinkButton } from "@/components/ui/link-button";

export default function NotFound() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <main id="main-content" className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
      {/* Large Visual */}
      <div className="relative mb-8">
        <div className="flex h-36 w-36 items-center justify-center rounded-full bg-gradient-to-br from-rose-50 to-orange-50 sm:h-44 sm:w-44">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-lg sm:h-28 sm:w-28">
            <ShoppingBag className="h-12 w-12 text-rose-400 sm:h-14 sm:w-14" />
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute -top-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-lg font-black text-amber-600 shadow-sm">
          ؟
        </div>
        <div className="absolute -bottom-1 -left-3 flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-black text-blue-500 shadow-sm">
          !
        </div>
      </div>

      {/* Text */}
      <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-rose-50 px-4 py-1.5 text-xs font-bold text-rose-700">
        خطای ۴۰۴
      </div>
      <h1 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">صفحه مورد نظر یافت نشد</h1>
      <p className="mt-3 max-w-md text-sm leading-7 text-slate-500">
        ممکن است آدرس وارد شده اشتباه باشد یا صفحه مورد نظر حذف شده باشد. می‌توانید جستجو کنید یا به صفحه اصلی بازگردید.
      </p>

      {/* Search */}
      <form onSubmit={handleSearch} className="mt-8 w-full max-w-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در محصولات..."
            className="h-12 w-full rounded-full border border-slate-200 bg-slate-50 pr-11 pl-4 text-sm outline-none transition focus:border-rose-300 focus:bg-white focus:ring-4 focus:ring-rose-50"
            aria-label="جستجو در محصولات"
          />
        </div>
      </form>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <LinkButton href="/" className="rounded-full">
          <Home className="h-4 w-4" />
          صفحه اصلی
        </LinkButton>
        <LinkButton href="/products" variant="outline" className="rounded-full">
          <ArrowLeft className="h-4 w-4" />
          مشاهده محصولات
        </LinkButton>
      </div>
    </main>
  );
}
