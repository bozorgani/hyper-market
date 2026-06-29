import { Badge } from "@/components/ui/badge";
import {
  translateAccountStatus,
  translateOrderStatus,
  translatePaymentStatus,
} from "@/lib/utils";

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

export function OrderStatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700",
    paid: "bg-sky-50 text-sky-700",
    processing: "bg-violet-50 text-violet-700",
    shipped: "bg-indigo-50 text-indigo-700",
    delivered: "bg-emerald-50 text-emerald-700",
    cancelled: "bg-red-50 text-red-700",
  };

  return <Badge className={classes[status] ?? "bg-slate-100 text-slate-700"}>{translateOrderStatus(status)}</Badge>;
}

export function PaymentStatusBadge({ status }: { status?: string }) {
  const classes: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700",
    paid: "bg-emerald-50 text-emerald-700",
    failed: "bg-red-50 text-red-700",
    cancelled: "bg-slate-100 text-slate-700",
  };

  return <Badge className={classes[status ?? ""] ?? "bg-slate-100 text-slate-700"}>{translatePaymentStatus(status)}</Badge>;
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
