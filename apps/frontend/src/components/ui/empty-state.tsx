import type { ReactNode } from "react";
import { PackageOpen } from "lucide-react";
import { Card } from "@/components/ui/card";

export function EmptyState({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <Card className="p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <PackageOpen className="h-7 w-7" />
      </div>
      <p className="mt-5 text-xl font-black text-slate-900">{title}</p>
      <p className="mt-3 text-sm leading-7 text-slate-500">{description}</p>
      {actions ? <div className="mt-6 flex justify-center gap-3">{actions}</div> : null}
    </Card>
  );
}
