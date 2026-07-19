import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        dir="rtl"
        className={cn(
          "h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-right text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-rose-400 focus:ring-4 focus:ring-rose-100 disabled:bg-slate-50 disabled:text-slate-500",
          className,
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
