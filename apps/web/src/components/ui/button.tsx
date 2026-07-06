import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "success";
  size?: "default" | "sm" | "lg" | "icon";
};

const variants = {
  default: "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800",
  secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-300",
  outline: "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 active:bg-slate-100",
  ghost: "text-slate-700 hover:bg-slate-100 active:bg-slate-200",
  destructive: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
  success: "bg-emerald-500 text-white hover:bg-emerald-600 active:bg-emerald-700",
};

const sizes = {
  default: "h-11 px-4 py-2 text-sm",
  sm: "h-9 px-3 py-1.5 text-xs rounded-lg",
  lg: "h-12 px-6 py-3 text-base",
  icon: "h-11 w-11 p-0",
};

export function Button({ className, variant = "default", size = "default", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex touch-manipulation items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 active:scale-[0.985]",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
