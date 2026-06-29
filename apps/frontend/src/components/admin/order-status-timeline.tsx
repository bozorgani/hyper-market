import { CheckCircle2, Circle, XCircle } from "lucide-react";
import { OrderStatusBadge } from "@/components/admin/admin-status-badge";
import { cn, translateOrderStatus } from "@/lib/utils";
import type { OrderStatus } from "@/types/domain";

const flow: OrderStatus[] = ["pending", "paid", "processing", "shipped", "delivered"];

export function OrderStatusTimeline({ status }: { status: OrderStatus }) {
  if (status === "cancelled") {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-right">
        <div className="flex items-center gap-3 text-red-700">
          <XCircle className="h-6 w-6" />
          <div>
            <p className="font-black">سفارش لغو شده است</p>
            <p className="mt-1 text-sm">این سفارش به مرحله تکمیل نرسیده و در وضعیت لغوشده قرار دارد.</p>
          </div>
        </div>
      </div>
    );
  }

  const activeIndex = flow.indexOf(status);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-black text-slate-950">تایم‌لاین وضعیت سفارش</h2>
        <OrderStatusBadge status={status} />
      </div>
      <div className="grid gap-4 md:grid-cols-5">
        {flow.map((step, index) => {
          const completed = index <= activeIndex;
          const current = index === activeIndex;
          return (
            <div key={step} className="relative rounded-2xl bg-slate-50 p-4 text-center">
              {index < flow.length - 1 ? (
                <div className="absolute -left-3 top-7 hidden h-0.5 w-6 bg-slate-200 md:block" />
              ) : null}
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
                {completed ? (
                  <CheckCircle2 className={cn("h-5 w-5", current ? "text-rose-600" : "text-emerald-600")} />
                ) : (
                  <Circle className="h-4 w-4 text-slate-400" />
                )}
              </div>
              <p className={cn("mt-3 text-sm font-semibold", completed ? "text-slate-900" : "text-slate-400")}>
                {translateOrderStatus(step)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {current ? "وضعیت فعلی سفارش" : completed ? "مرحله تکمیل‌شده" : "در انتظار رسیدن"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
