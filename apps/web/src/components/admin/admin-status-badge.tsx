import { Badge } from "@/components/ui/badge";
import { translateAccountStatus } from "@/lib/utils";

// Order/payment badges live in @/components/order/status-badge so customer
// components don't depend on the admin folder. Re-exported here to keep the
// existing admin imports working without churn.
export { OrderStatusBadge, PaymentStatusBadge } from "@/components/order/status-badge";

export function ProductStatusBadge({ isActive }: { isActive?: boolean }) {
  if (typeof isActive !== "boolean") {
    return <Badge className="bg-amber-50 text-amber-700">نامشخص</Badge>;
  }

  return (
    <Badge className={isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}>
      {isActive ? "فعال" : "غیرفعال"}
    </Badge>
  );
}

export function AccountStatusBadge({ status }: { status?: string }) {
  const classes: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700",
    active: "bg-emerald-50 text-emerald-700",
    suspended: "bg-red-50 text-red-700",
    deactivated: "bg-slate-100 text-slate-700",
    banned: "bg-red-100 text-red-800",
  };

  return <Badge className={classes[status ?? ""] ?? "bg-slate-100 text-slate-700"}>{translateAccountStatus(status)}</Badge>;
}
