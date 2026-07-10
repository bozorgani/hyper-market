"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";

export function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  const pages: Array<number | "..."> = [];

  if (totalPages <= 7) {
    for (let index = 1; index <= totalPages; index += 1) pages.push(index);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");

    const rangeStart = Math.max(2, page - 1);
    const rangeEnd = Math.min(totalPages - 1, page + 1);
    for (let index = rangeStart; index <= rangeEnd; index += 1) pages.push(index);

    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <nav className="mt-8 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between" aria-label="صفحه‌بندی نتایج جستجو">
      <p className="text-sm text-slate-500">
        نمایش <span className="font-semibold text-slate-700">{formatNumber(start)}</span> تا{" "}
        <span className="font-semibold text-slate-700">{formatNumber(end)}</span> از{" "}
        <span className="font-semibold text-slate-700">{formatNumber(totalItems)}</span> نتیجه
      </p>

      <div className="flex items-center justify-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="صفحه قبل"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>

        {pages.map((item, index) =>
          item === "..." ? (
            <span key={`ellipsis-${index}`} className="flex h-10 w-8 items-center justify-center text-slate-400" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              type="button"
              key={item}
              onClick={() => onPageChange(item)}
              aria-label={`صفحه ${formatNumber(item)}`}
              aria-current={item === page ? "page" : undefined}
              className={cn(
                "flex h-10 min-w-10 items-center justify-center rounded-xl px-2 text-sm font-semibold transition",
                item === page ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100",
              )}
            >
              {formatNumber(item)}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="صفحه بعد"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
