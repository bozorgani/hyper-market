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
      <div className="relative mx-auto mb-2">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-slate-50 to-slate-100 shadow-inner">
          <Icon className="h-9 w-9 text-slate-400" />
        </div>
      </div>
      <p className="mt-4 text-xl font-black text-slate-900">{title}</p>
      <p className="mt-2.5 max-w-sm mx-auto text-sm leading-7 text-slate-500">{description}</p>
      {actions && <div className="mt-7 flex flex-wrap justify-center gap-3">{actions}</div>}
    </Card>
  );
}
