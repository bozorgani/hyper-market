import type { ReactNode } from "react";
import { PackageOpen } from "lucide-react";
import { Card } from "@/components/ui/card";

export function EmptyState({
  title,
  description,
  actions,
  icon: Icon = PackageOpen,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="p-10 text-center empty-state">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon className="h-8 w-8" />
      </div>
      <p className="mt-6 text-xl font-black text-slate-900">{title}</p>
      <p className="mt-2.5 max-w-xs mx-auto text-sm leading-6 text-slate-500">{description}</p>
      {actions && <div className="mt-7 flex justify-center gap-3">{actions}</div>}
    </Card>
  );
}
