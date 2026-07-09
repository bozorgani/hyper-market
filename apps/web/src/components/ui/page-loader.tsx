import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PageLoader({ title = "در حال آماده‌سازی صفحه..." }: { title?: string }) {
  return (
    <main id="main-content" className="mx-auto max-w-5xl px-4 py-8 text-right">
      <p className="mb-5 text-sm font-semibold text-slate-500">{title}</p>
      <div className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
        <Card className="p-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-4 h-5 w-3/4" />
          <div className="mt-6 space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </Card>
        <Card className="p-6">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="mt-4 h-5 w-full" />
          <Skeleton className="mt-3 h-5 w-5/6" />
          <Skeleton className="mt-6 h-11 w-full" />
          <Skeleton className="mt-3 h-11 w-full" />
        </Card>
      </div>
    </main>
  );
}
