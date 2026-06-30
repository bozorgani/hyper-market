"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";

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

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">
        نمایش {formatNumber(start)} تا {formatNumber(end)} از {formatNumber(totalItems)} مورد
      </p>
      <div className="flex items-center gap-2 self-end sm:self-auto">
        <Button type="button" variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronRight className="h-4 w-4" />
          قبلی
        </Button>
        <div className="rounded-xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
          صفحه {formatNumber(page)} از {formatNumber(totalPages)}
        </div>
        <Button type="button" variant="outline" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          بعدی
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
