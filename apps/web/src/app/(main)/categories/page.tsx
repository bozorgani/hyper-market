import type { Metadata } from "next";
import Link from "next/link";
import { CategoryVisual } from "@/components/category-visual";
import { Card } from "@/components/ui/card";
import { fallbackCategories, getCategoryProductsHref } from "@/lib/category-utils";
import { fetchCategoriesForSSR } from "@/lib/server-api";

export const dynamic = "force-dynamic";

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
  const hasRealCategories = Boolean(categories?.length);
  const visibleCategories = hasRealCategories ? categories! : fallbackCategories;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 text-right">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900">دسته‌بندی‌ها</h1>
        <p className="mt-2 text-sm leading-7 text-slate-500">از این بخش می‌توانید محصولات هر دسته را مشاهده کنید.</p>
        {!hasRealCategories ? (
          <p className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-700">
            دسته‌بندی فعال از بک‌اند دریافت نشد؛ فعلاً دسته‌های پیشنهادی نمایش داده شده‌اند.
          </p>
        ) : null}
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visibleCategories.map((category) => (
          <Link key={category._id} href={getCategoryProductsHref(category)}>
            <Card className="flex h-full items-center gap-4 p-5 transition hover:border-rose-200 hover:shadow-md">
              <CategoryVisual name={category.name} icon={category.icon} image={category.image} />
              <div>
                <h2 className="font-black text-slate-900">{category.name}</h2>
                {category.description ? <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{category.description}</p> : null}
              </div>
            </Card>
          </Link>
        ))}
      </section>
    </main>
  );
}
