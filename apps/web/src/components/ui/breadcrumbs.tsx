import Link from "next/link";
import { ChevronLeft, Home } from "lucide-react";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="مسیر ناوبری" className="flex items-center gap-1.5 text-xs text-slate-400 overflow-x-auto scrollbar-hide">
      <Link
        href="/"
        className="flex items-center gap-1 shrink-0 text-slate-400 transition hover:text-rose-600"
        aria-label="صفحه اصلی"
      >
        <Home className="h-3.5 w-3.5" />
        <span>خانه</span>
      </Link>
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-1.5 shrink-0">
          <ChevronLeft className="h-3 w-3 text-slate-300" aria-hidden="true" />
          {item.href ? (
            <Link
              href={item.href}
              className="transition hover:text-rose-600"
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-semibold text-slate-600 truncate max-w-[200px]" aria-current="page">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
