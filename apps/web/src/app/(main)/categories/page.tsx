import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getCategoryProductsHref } from "@/lib/category-utils";
import { fetchCategoriesForSSR } from "@/lib/server-api";

export const metadata: Metadata = {
  title: "دسته‌بندی‌ها",
  description: "مشاهده دسته‌بندی‌های فعال محصولات هایپرمارکت و دسترسی سریع به محصولات هر دسته.",
  alternates: { canonical: "/categories" },
  openGraph: {
    title: "دسته‌بندی‌های هایپرمارکت",
    description: "دسته‌بندی‌های فعال محصولات هایپرمارکت",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "دسته‌بندی‌های هایپرمارکت",
    description: "دسته‌بندی‌های فعال محصولات هایپرمارکت",
  },
};

export default async function CategoriesPage() {
  const categories = await fetchCategoriesForSSR();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 text-right">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900">دسته‌بندی‌ها</h1>
        <p className="mt-2 text-sm leading-7 text-slate-500">از این بخش می‌توانید محصولات هر دسته را مشاهده کنید.</p>
      </div>

      {!categories || categories.length === 0 ? (
        <EmptyState title="دسته‌بندی فعالی وجود ندارد" description="در حال حاضر دسته‌بندی قابل نمایش ثبت نشده است." />
      ) : (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link key={category._id} href={getCategoryProductsHref(category)}>
              <Card className="flex h-full items-center gap-4 p-5 transition hover:border-emerald-200 hover:shadow-md">
                <span className="text-3xl">{category.icon || "📦"}</span>
                <div>
                  <h2 className="font-black text-slate-900">{category.name}</h2>
                  {category.description ? <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{category.description}</p> : null}
                </div>
              </Card>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
