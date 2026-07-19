import { Check, Clock, Truck, Package, X } from "lucide-react";
import type { OrderStatus } from "@/types/domain";

const steps: Array<{ key: OrderStatus; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: "pending", label: "در انتظار", icon: Clock },
  { key: "paid", label: "پرداخت‌شده", icon: Check },
  { key: "processing", label: "در حال پردازش", icon: Package },
  { key: "shipped", label: "ارسال‌شده", icon: Truck },
  { key: "delivered", label: "تحویل‌شده", icon: Check },
];

export function OrderTrackingTimeline({ status }: { status: string }) {
  const currentIndex = steps.findIndex((s) => s.key === status);
  const isCancelled = status === "cancelled";

  return (
    <div className="relative">
      <div className="absolute right-[19px] top-3 bottom-3 w-px bg-slate-200 md:right-[27px]" />
      <div className="space-y-6">
        {steps.map((step, index) => {
          const isDone = !isCancelled && currentIndex >= index;
          const isCurrent = !isCancelled && currentIndex === index;
          const Icon = step.icon;
          return (
            <div key={step.key} className="flex items-start gap-3 md:gap-4">
              <div
                className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 md:h-14 md:w-14 ${
                  isDone
                    ? "border-rose-700 bg-rose-700 text-white"
                    : isCurrent
                      ? "border-rose-600 bg-rose-50 text-rose-700"
                      : "border-slate-200 bg-white text-slate-400"
                }`}
              >
                {isDone ? <Check className="h-5 w-5 md:h-6 md:w-6" /> : <Icon className="h-5 w-5 md:h-6 md:w-6" />}
              </div>
              <div className="pt-1 md:pt-2.5">
                <p
                  className={`text-sm font-bold md:text-base ${
                    isDone || isCurrent ? "text-foreground" : "text-slate-400"
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-xs text-slate-500 md:text-sm">{isDone ? "تکمیل شده" : isCurrent ? "در حال انجام" : "در انتظار"}</p>
              </div>
            </div>
          );
        })}
        {isCancelled && (
          <div className="flex items-start gap-3 md:gap-4">
            <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-red-200 bg-red-50 text-red-700 md:h-14 md:w-14">
              <X className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div className="pt-1 md:pt-2.5">
              <p className="text-sm font-bold text-red-700 md:text-base">لغوشده</p>
              <p className="text-xs text-red-500 md:text-sm">سفارش لغو شده است</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
