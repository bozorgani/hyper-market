"use client";

import { X, SlidersHorizontal } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";

export function MobileFilterSheet({
  open,
  onClose,
  title = "فیلترها",
  activeCount = 0,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  activeCount?: number;
  children: React.ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      ariaLabel={title}
      containerClassName="z-[70] items-end p-0 md:hidden"
      className="max-h-[88vh] max-w-none overflow-y-auto rounded-t-3xl rounded-b-none p-5 sm:p-6"
    >
      <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <p className="font-black text-slate-900">{title}</p>
            {activeCount > 0 ? <p className="mt-0.5 text-xs text-slate-500">{activeCount.toLocaleString("fa-IR")} فیلتر فعال</p> : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-4 focus-visible:ring-rose-100"
          aria-label="بستن فیلترها"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <div className="space-y-4">{children}</div>
      <button
        type="button"
        onClick={onClose}
        className="mt-6 min-h-11 w-full rounded-2xl bg-rose-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-rose-700 focus-visible:ring-4 focus-visible:ring-rose-200"
      >
        نمایش نتایج
      </button>
    </Dialog>
  );
}
