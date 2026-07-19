import { cn } from "@/lib/utils";

// Order/payment badges live in @/components/order/status-badge so customer
// components don't depend on the admin folder. Re-exported here to keep the
// existing admin imports working without churn.
export { OrderStatusBadge, PaymentStatusBadge } from "@/components/order/status-badge";

export function ProductStatusBadge({ isActive }: { isActive?: boolean }) {
  if (typeof isActive !== "boolean") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200/50">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        نامشخص
      </span>
    );
  }
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ring-1",
      isActive
        ? "bg-rose-50 text-rose-700 ring-rose-200/50"
        : "bg-slate-100 text-slate-500 ring-slate-200/50",
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", isActive ? "bg-rose-500" : "bg-slate-400")} />
      {isActive ? "فعال" : "غیرفعال"}
    </span>
  );
}

export function AccountStatusBadge({ status }: { status?: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/50",
    active: "bg-rose-50 text-rose-700 ring-1 ring-rose-200/50",
    suspended: "bg-red-50 text-red-600 ring-1 ring-red-200/50",
    deactivated: "bg-slate-100 text-slate-500 ring-1 ring-slate-200/50",
    banned: "bg-red-100 text-red-800 ring-1 ring-red-200/50",
  };
  const dotColors: Record<string, string> = {
    pending: "bg-amber-500",
    active: "bg-rose-500",
    suspended: "bg-red-500",
    deactivated: "bg-slate-400",
    banned: "bg-red-600",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ring-1", styles[status ?? ""] ?? "bg-slate-100 text-slate-600 ring-slate-200/50")}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dotColors[status ?? ""] ?? "bg-slate-400")} />
      {_translateAccountStatus(status)}
    </span>
  );
}

function _translateAccountStatus(status?: string) {
  const map: Record<string, string> = {
    pending: "در انتظار تأیید",
    active: "فعال",
    suspended: "مسدود",
    deactivated: "غیرفعال",
    banned: "ممنوع",
  };
  return status ? map[status] ?? status : "نامشخص";
}