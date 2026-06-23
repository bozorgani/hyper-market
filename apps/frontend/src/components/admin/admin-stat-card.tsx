import { Card } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";

export function AdminStatCard({ title, value, hint }: { title: string; value: number | string; hint?: string }) {
  return (
    <Card className="p-5 text-right">
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-black text-slate-950">
        {typeof value === "number" ? formatNumber(value) : value}
      </p>
      {hint ? <p className="mt-2 text-xs text-slate-400">{hint}</p> : null}
    </Card>
  );
}
