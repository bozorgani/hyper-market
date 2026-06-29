"use client";

import { FormEvent, useMemo, useState } from "react";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import {
  CategoryFormInput,
  useAdminCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from "@/features/admin/admin-api";
import type { Category } from "@/types/domain";
import { formatNumber } from "@/lib/utils";

const emptyForm: CategoryFormInput = {
  name: "",
  slug: "",
};

const PAGE_SIZE = 8;

export default function AdminCategoriesPage() {
  const categories = useAdminCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const { showToast } = useToast();
  const [form, setForm] = useState<CategoryFormInput>(emptyForm);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const isSubmitting = createCategory.isPending || updateCategory.isPending;

  const filteredCategories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return categories.data ?? [];
    return (categories.data ?? []).filter((category) =>
      category.name.toLowerCase().includes(normalizedQuery) || category.slug.toLowerCase().includes(normalizedQuery),
    );
  }, [categories.data, query]);

  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / PAGE_SIZE));
  const paginatedCategories = filteredCategories.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function resetForm() {
    setForm(emptyForm);
    setEditingCategory(null);
  }

  function startEdit(category: Category) {
    setEditingCategory(category);
    setForm({ name: category.name, slug: category.slug });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({ id: editingCategory._id, input: form });
        showToast({ type: "success", title: "دسته‌بندی ویرایش شد" });
      } else {
        await createCategory.mutateAsync(form);
        showToast({ type: "success", title: "دسته‌بندی ایجاد شد" });
      }
      resetForm();
    } catch (error) {
      showToast({ type: "error", title: "خطا در عملیات دسته‌بندی", description: error instanceof Error ? error.message : undefined });
    }
  }

  async function removeCategory() {
    if (!categoryToDelete) return;

    try {
      await deleteCategory.mutateAsync(categoryToDelete._id);
      showToast({ type: "success", title: "دسته‌بندی حذف شد" });
      if (editingCategory?._id === categoryToDelete._id) {
        resetForm();
      }
      setCategoryToDelete(null);
    } catch (error) {
      showToast({ type: "error", title: "حذف دسته‌بندی ناموفق بود", description: error instanceof Error ? error.message : undefined });
    }
  }

  return (
    <main className="space-y-5 text-right">
      <PageHeader
        title="مدیریت دسته‌بندی‌ها"
        description="ایجاد، ویرایش، حذف نرم و جستجو در دسته‌بندی‌های فروشگاه"
      />

      <Card className="p-5">
        <form onSubmit={submit} className="grid gap-3 lg:grid-cols-[1fr_1fr_auto_auto]">
          <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="نام دسته‌بندی" required />
          <Input value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value.toLowerCase() })} placeholder="اسلاگ انگلیسی مثل mobile" required />
          <Button type="submit" disabled={isSubmitting}>{editingCategory ? "ذخیره ویرایش" : "افزودن دسته‌بندی"}</Button>
          {editingCategory ? <Button type="button" variant="outline" onClick={resetForm}>لغو</Button> : null}
        </form>
      </Card>

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <Input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="جستجو بر اساس نام یا اسلاگ دسته‌بندی..." />
          <Button type="button" variant="outline" onClick={() => { setQuery(""); setPage(1); }}>پاک‌کردن جستجو</Button>
        </div>
      </Card>

      {categories.isError ? (
        <ErrorState title="امکان دریافت دسته‌بندی‌ها وجود ندارد" description="لطفاً دوباره تلاش کنید یا وضعیت API را بررسی کنید." actions={<Button type="button" variant="outline" onClick={() => categories.refetch()}>تلاش مجدد</Button>} />
      ) : null}

      {!categories.isError ? (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 text-sm text-slate-500">
            <p>فهرست دسته‌بندی‌ها</p>
            <p>{formatNumber(filteredCategories.length)} مورد</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-right text-sm">
              <thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">نام</th><th className="p-4">اسلاگ</th><th className="p-4">عملیات</th></tr></thead>
              <tbody>
                {categories.isLoading ? Array.from({ length: 4 }).map((_, index) => (
                  <tr key={index}><td className="p-4" colSpan={3}><Skeleton className="h-10 w-full" /></td></tr>
                )) : null}
                {!categories.isLoading && paginatedCategories.map((category) => (
                  <tr key={category._id} className="border-b border-slate-100 transition hover:bg-slate-50/80">
                    <td className="p-4 font-bold text-slate-900">{category.name}</td>
                    <td className="p-4 ltr text-left">{category.slug}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" onClick={() => startEdit(category)}>ویرایش</Button>
                        <Button type="button" variant="destructive" onClick={() => setCategoryToDelete(category)} disabled={deleteCategory.isPending}>حذف</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!categories.isLoading && filteredCategories.length === 0 ? (
            <div className="p-4">
              <EmptyState title="دسته‌بندی‌ای یافت نشد" description="عبارت جستجو را تغییر دهید یا دسته‌بندی جدید بسازید." actions={<Button type="button" onClick={() => { setQuery(""); setPage(1); }}>پاک‌کردن جستجو</Button>} />
            </div>
          ) : null}
          {!categories.isLoading && filteredCategories.length > 0 ? <AdminPagination page={page} totalPages={totalPages} totalItems={filteredCategories.length} pageSize={PAGE_SIZE} onPageChange={setPage} /> : null}
        </Card>
      ) : null}

      <ConfirmDialog
        open={Boolean(categoryToDelete)}
        title="حذف دسته‌بندی"
        description={`آیا از حذف دسته‌بندی «${categoryToDelete?.name ?? ""}» مطمئن هستید؟ در صورت وجود وابستگی محصول، بک‌اند حذف را رد خواهد کرد.`}
        confirmText="حذف دسته‌بندی"
        destructive
        loading={deleteCategory.isPending}
        onConfirm={removeCategory}
        onCancel={() => setCategoryToDelete(null)}
      />
    </main>
  );
}
