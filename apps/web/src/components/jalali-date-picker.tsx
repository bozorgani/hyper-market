"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  JALALI_MONTH_NAMES,
  JALALI_WEEKDAY_LABELS,
  formatJalaliDate,
  isoToJalali,
  jalaliMonthDayCount,
  jalaliMonthStartWeekday,
  jalaliToISODate,
  toJalali,
  toPersianDigits,
} from "@/lib/jalali";

type Props = {
  value: string; // ISO YYYY-MM-DD
  min?: string; // ISO YYYY-MM-DD
  onChange: (iso: string) => void;
  disabled?: boolean;
  className?: string;
};

function buildMonthGrid(jy: number, jm: number): (number | null)[] {
  const leading = jalaliMonthStartWeekday(jy, jm);
  const days = jalaliMonthDayCount(jy, jm);
  const cells: (number | null)[] = [];
  for (let i = 0; i < leading; i += 1) cells.push(null);
  for (let d = 1; d <= days; d += 1) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function JalaliDatePicker({ value, min, onChange, disabled, className }: Props) {
  const initial = isoToJalali(value) ?? toJalaliToday();
  const [view, setView] = useState({ jy: initial.jy, jm: initial.jm });
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const cells = useMemo(() => buildMonthGrid(view.jy, view.jm), [view]);

  function shiftMonth(delta: number) {
    setView((prev) => {
      const total = prev.jm - 1 + delta;
      const jm = ((total % 12) + 12) % 12 + 1;
      const jy = prev.jy + Math.floor((total - (jm - 1)) / 12);
      return { jy, jm };
    });
  }

  function selectDay(day: number) {
    const iso = jalaliToISODate(view.jy, view.jm, day);
    if (min && iso < min) return;
    onChange(iso);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="flex h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-right text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:ring-4 focus:ring-rose-100 disabled:bg-slate-100"
      >
        <span className={value ? "text-slate-900" : "text-slate-400"}>
          {value ? formatJalaliDate(value, true) : "انتخاب تاریخ تحویل"}
        </span>
        <span className="text-slate-400" aria-hidden>
          🗓
        </span>
      </button>

      {open ? (
        <div className="absolute z-30 mt-2 w-[18rem] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              aria-label="ماه قبل"
            >
              ›
            </button>
            <span className="text-sm font-bold text-slate-900">
              {JALALI_MONTH_NAMES[view.jm - 1]} {toPersianDigits(view.jy)}
            </span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              aria-label="ماه بعد"
            >
              ‹
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400">
            {JALALI_WEEKDAY_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, index) => {
              if (day === null) return <span key={`e-${index}`} />;
              const iso = jalaliToISODate(view.jy, view.jm, day);
              const isSelected = iso === value;
              const isDisabled = Boolean(min && iso < min);
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => selectDay(day)}
                  className={cn(
                    "flex h-9 items-center justify-center rounded-lg text-sm transition",
                    isSelected
                      ? "bg-rose-600 font-bold text-white"
                      : "text-slate-700 hover:bg-rose-50",
                    isDisabled && "cursor-not-allowed text-slate-300 hover:bg-transparent",
                  )}
                >
                  {toPersianDigits(day)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function toJalaliToday(): { jy: number; jm: number; jd: number } {
  const now = new Date();
  return toJalali(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}
