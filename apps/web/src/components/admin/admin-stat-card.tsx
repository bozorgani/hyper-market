"use client";

import { motion } from "framer-motion";
import { type LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";

export function AdminStatCard({
  title,
  value,
  hint,
  icon: Icon,
  trend,
  gradient,
  delay = 0,
}: {
  title: string;
  value: number | string;
  hint?: string;
  icon?: LucideIcon;
  trend?: { value: number; label?: string };
  gradient?: string;
  delay?: number;
}) {
  const isUp = trend && trend.value >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Decorative gradient blob */}
      <div className={cn(
        "absolute -left-6 -top-6 h-24 w-24 rounded-full opacity-10 blur-2xl transition-transform group-hover:scale-125",
        gradient ?? "bg-emerald-500",
      )} />

      <div className="relative flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-black text-slate-900 lg:text-3xl">
            {typeof value === "number" ? formatNumber(value) : value}
          </p>
          {hint && <p className="mt-1.5 text-xs text-slate-400">{hint}</p>}
          {trend && (
            <div className="mt-2.5 flex items-center gap-1.5">
              {isUp ? (
                <div className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                  <TrendingUp className="h-3 w-3" />
                  {trend.value}%
                </div>
              ) : (
                <div className="flex items-center gap-1 rounded-lg bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
                  <TrendingDown className="h-3 w-3" />
                  {Math.abs(trend.value)}%
                </div>
              )}
              {trend.label && <span className="text-xs text-slate-400">{trend.label}</span>}
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-105",
            gradient === "bg-rose-500" && "bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-200",
            gradient === "bg-blue-500" && "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-200",
            gradient === "bg-amber-500" && "bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-200",
            gradient === "bg-violet-500" && "bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-200",
            !gradient && "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200",
          )}>
            <Icon className="h-6 w-6" />
          </div>
        )}
      </div>
    </motion.div>
  );
}