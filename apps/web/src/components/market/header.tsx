"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ShoppingCart, ArrowRight, X, MapPin } from "lucide-react";
import { useMarketStore } from "@/store/market-store";

export function Header() {
  const { currentPage, goBack, navigate, getCartCount, searchQuery, setSearchQuery } = useMarketStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cartCount = getCartCount();

  const showBack = currentPage.type !== "home";

  useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [searchOpen]);

  const handleSearch = useCallback(() => {
    const q = searchQuery.trim();
    if (q) {
      navigate({ type: "products", searchQuery: q });
    }
    setSearchOpen(false);
  }, [searchQuery, navigate, setSearchOpen]);

  return (
    <>
      <header className="glass sticky top-0 z-50 border-b border-white/20">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          {showBack && (
            <button onClick={goBack} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5 transition-colors">
              <ArrowRight size={20} className="text-slate-700" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 text-white text-sm font-black">س</div>
            <span className="text-lg font-black text-slate-800">اسنپ‌مارکت</span>
          </div>
          <div className="flex-1" />
          <button onClick={() => setSearchOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5 transition-colors">
            <Search size={20} className="text-slate-600" />
          </button>
          <button onClick={() => navigate({ type: "cart" })} className="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5 transition-colors">
            <ShoppingCart size={20} className="text-slate-600" />
            <AnimatePresence>
              {cartCount > 0 && (
                <motion.span
                  key="badge"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-0.5 -left-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
                >
                  {cartCount > 9 ? "۹+" : cartCount.toLocaleString("fa-IR")}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <div className="hidden sm:flex items-center gap-1 text-xs text-slate-500">
            <MapPin size={12} />
            <span>تهران</span>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-[100] bg-white flex flex-col"
          >
            <div className="flex items-center gap-3 border-b px-4 h-14">
              <button onClick={() => setSearchOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5">
                <X size={20} className="text-slate-600" />
              </button>
              <input
                ref={inputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="جستجو در محصولات..."
                className="flex-1 h-10 bg-transparent text-base outline-none placeholder:text-slate-400"
              />
              <button onClick={handleSearch} className="text-sm font-semibold text-emerald-600 px-2">جستجو</button>
            </div>
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center text-slate-400">
                <Search size={48} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">نام محصول مورد نظر را جستجو کنید</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}