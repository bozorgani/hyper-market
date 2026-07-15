"use client";

import { motion, AnimatePresence } from "@/components/ui/csp-motion";
import { Search, X } from "lucide-react";
import { useRef, useEffect, type FormEvent } from "react";

type MobileSearchOverlayProps = {
  open: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
};

export function MobileSearchOverlay({
  open,
  query,
  onQueryChange,
  onSubmit,
  onClose,
}: MobileSearchOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="md:hidden absolute inset-x-0 top-0 z-50 bg-white border-b shadow px-4 py-3"
        >
          <form onSubmit={onSubmit} className="relative">
            <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="جستجو..."
              className="h-11 w-full rounded-2xl border bg-slate-50 pr-12 pl-10 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              aria-label="جستجو در محصولات"
            />
            <button
              type="button"
              onClick={onClose}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="بستن جستجو"
            >
              <X className="h-4 w-4" />
            </button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
