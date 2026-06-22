import { cn } from "@/lib/utils";

export function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700", className)}>
      {children}
    </span>
  );
}
