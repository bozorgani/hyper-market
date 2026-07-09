import { Badge } from "@/components/ui/badge";
import { translateOrderStatus, translatePaymentStatus } from "@/lib/utils";

// Shared order/payment status badges used by BOTH the customer-facing
// OrderCard and the admin panels. Kept out of the `admin` folder on purpose so
// customer components don't depend on admin-only modules.

export function OrderStatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700",
    paid: "bg-green-50 text-green-700",
    processing: "bg-violet-50 text-violet-700",
    shipped: "bg-indigo-50 text-indigo-700",
    delivered: "bg-green-50 text-green-700",
    cancelled: "bg-red-50 text-red-700",
  };

  return <Badge className={classes[status] ?? "bg-slate-100 text-slate-700"}>{translateOrderStatus(status)}</Badge>;
}

export function PaymentStatusBadge({ status }: { status?: string }) {
  const classes: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700",
    paid: "bg-green-50 text-green-700",
    failed: "bg-red-50 text-red-700",
    cancelled: "bg-slate-100 text-slate-700",
  };

  return <Badge className={classes[status ?? ""] ?? "bg-slate-100 text-slate-700"}>{translatePaymentStatus(status)}</Badge>;
}
