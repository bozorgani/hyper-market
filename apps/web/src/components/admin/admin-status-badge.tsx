import { cn } from "@/lib/utils";

// Order/payment badges live in @/components/order/status-badge so customer
// components don't depend on the admin folder. Re-exported here to keep the
// existing admin imports working without churn.
export { OrderStatusBadge, PaymentStatusBadge } from "@/components/order/status-badge";

const orderStyles: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/50",
  paid: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/50",
  processing: "bg-blue-50 text-blue-700 ring-1 ring-blue-200/50",
  shipped: "bg-violet-50 text-violet-700 ring-1 ring-violet-200/50",
  delivered: "bg-slate-100 text-slate-600 ring-1 ring-slate-200/50",
  cancelled: "bg-red-50 text-red-600 ring-1 ring-red-200/50",
};


// Wrap with enhanced styles
export function EnhancedOrderStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold", orderStyles[status] ?? "bg-slate-100 text-slate-600")}>
      <span className={cn("h-1.5 w-1.5 rounded-full", status === "pending" ? "bg-amber-500" : status === "paid" ? "bg-emerald-500" : status === "cancelled" ? "bg-red-500" : status === "shipped" ? "bg-violet-500" : "bg-slate-400")} />
      <span className="hidden sm:inline">{status}</span>
    </span>
  );
}

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
        ? "bg-emerald-50 text-emerald-700 ring-emerald-200/50"
        : "bg-slate-100 text-slate-500 ring-slate-200/50",
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", isActive ? "bg-emerald-500" : "bg-slate-400")} />
      {isActive ? "فعال" : "غیرفعال"}
    </span>
  );
}

export function AccountStatusBadge({ status }: { status?: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/50",
    active: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/50",
    suspended: "bg-red-50 text-red-600 ring-1 ring-red-200/50",
    deactivated: "bg-slate-100 text-slate-500 ring-1 ring-slate-200/50",
    banned: "bg-red-100 text-red-800 ring-1 ring-red-200/50",
  };
  const dotColors: Record<string, string> = {
    pending: "bg-amber-500",
    active: "bg-emerald-500",
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