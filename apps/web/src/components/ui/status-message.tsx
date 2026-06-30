import { cn } from "@/lib/utils";

const variantStyles = {
  info: "border-slate-200 bg-slate-50 text-slate-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  error: "border-red-200 bg-red-50 text-red-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
};

export function StatusMessage({
  children,
  variant = "info",
}: {
  children: React.ReactNode;
  variant?: keyof typeof variantStyles;
}) {
  return (
    <div className={cn("rounded-2xl border p-3 text-sm leading-7", variantStyles[variant])} role="status" aria-live="polite">
      {children}
    </div>
  );
}
