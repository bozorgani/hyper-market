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
    const opener = document.activeElement as HTMLElement | null;

    if (open) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      inputRef.current?.focus();

      return () => {
        document.body.style.overflow = previousOverflow;
        opener?.focus();
      };
    }

    return undefined;
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-slate-950/40 backdrop-blur-[2px] md:hidden"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
          role="presentation"
        >
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="absolute inset-x-0 top-0 border-b border-slate-200 bg-white px-4 pb-4 pt-3 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label="جستجو در محصولات"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <form onSubmit={onSubmit} className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => onQueryChange(e.target.value)}
                  placeholder="جستجو در محصولات..."
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pr-12 pl-3 text-sm outline-none focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-100"
                  aria-label="جستجو در محصولات"
                  autoComplete="off"
                />
              </div>
              <button
                type="submit"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white transition hover:bg-rose-700 focus-visible:ring-4 focus-visible:ring-rose-200"
                aria-label="جستجو"
              >
                <Search className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-4 focus-visible:ring-slate-200"
                aria-label="بستن جستجو"
                title="بستن جستجو"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
