"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";

export function AdminPagination({
  page,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
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

  // Generate page numbers to show
  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    const rangeStart = Math.max(2, page - 1);
    const rangeEnd = Math.min(totalPages - 1, page + 1);
    for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">
        نمایش <span className="font-semibold text-slate-700">{formatNumber(start)}</span> تا{" "}
        <span className="font-semibold text-slate-700">{formatNumber(end)}</span> از{" "}
        <span className="font-semibold text-slate-700">{formatNumber(totalItems)}</span> مورد
      </p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        {pages.map((p, idx) =>
          p === "..." ? (
            <span key={`dots-${idx}`} className="flex h-9 w-9 items-center justify-center text-slate-400">...</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition",
                p === page
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-200"
                  : "text-slate-600 hover:bg-slate-100",
              )}
            >
              {formatNumber(p)}
            </button>
          ),
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}