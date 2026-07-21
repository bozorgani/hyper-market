import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function SearchLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6 text-right">
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-3 h-5 w-80" />
      </div>
      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Card key={index} className="overflow-hidden">
            <Skeleton className="aspect-square w-full rounded-none" />
            <div className="space-y-2 p-4">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-2/3" />
            </div>
          </Card>
        ))}
      </section>
    </main>
  );
}
