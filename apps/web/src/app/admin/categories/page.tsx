"use client";

import { FormEvent, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, Plus, Edit3, Trash2, RefreshCw, FolderTree, Eye, EyeOff } from "lucide-react";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
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

const emptyForm: CategoryFormInput = { name: "", slug: "", description: "", icon: "", image: "", parentId: null, sortOrder: 0, isActive: true };
const PAGE_SIZE = 8;

export default function AdminCategoriesPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const categories = useAdminCategories(page, PAGE_SIZE);
  const allCategories = useAdminCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const { showToast } = useToast();
  const [form, setForm] = useState<CategoryFormInput>(emptyForm);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const isSubmitting = createCategory.isPending || updateCategory.isPending;

  const filteredCategories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return categories.data?.items ?? [];
    return (categories.data?.items ?? []).filter((category) =>
      category.name.toLowerCase().includes(normalizedQuery) || category.slug.toLowerCase().includes(normalizedQuery),
    );
  }, [categories.data?.items, query]);

  const totalItems = query.trim() ? filteredCategories.length : (categories.data?.total ?? 0);
  const totalPages = query.trim()
    ? Math.max(1, Math.ceil(filteredCategories.length / PAGE_SIZE))
    : (categories.data?.meta?.totalPages ?? Math.max(1, Math.ceil(totalItems / PAGE_SIZE)));
  const paginatedCategories = filteredCategories;

  // Build parent category options (root categories only, excluding current editing)
  const rootCategories = useMemo(() => {
    return (allCategories.data?.items ?? []).filter((cat) => {
      if (!cat.parentId) return cat._id !== editingCategory?._id;
      return false;
    });
  }, [allCategories.data?.items, editingCategory]);

  function resetForm() { setForm(emptyForm); setEditingCategory(null); }
  function startEdit(category: Category) {
    setEditingCategory(category);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      icon: category.icon ?? "",
      image: category.image ?? "",
      parentId: category.parentId ?? null,
      sortOrder: category.sortOrder ?? 0,
      isActive: category.isActive ?? true,
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const cleaned: CategoryFormInput = {
        ...form,
        description: form.description?.trim() || undefined,
        icon: form.icon?.trim() || undefined,
        image: form.image?.trim() || undefined,
        parentId: form.parentId || null,
        sortOrder: form.sortOrder ?? 0,
        isActive: form.isActive ?? true,
      };
      if (editingCategory) {
        await updateCategory.mutateAsync({ id: editingCategory._id, input: cleaned });
        showToast({ type: "success", title: "دسته‌بندی ویرایش شد" });
      } else {
        await createCategory.mutateAsync(cleaned);
        showToast({ type: "success", title: "دسته‌بندی ایجاد شد" });
      }
      resetForm();
    } catch (error) {
      showToast({ type: "error", title: "خطا در عملیات", description: error instanceof Error ? error.message : undefined });
    }
  }

  async function removeCategory() {
    if (!categoryToDelete) return;
    try {
      await deleteCategory.mutateAsync(categoryToDelete._id);
      showToast({ type: "success", title: "دسته‌بندی حذف شد" });
      if (editingCategory?._id === categoryToDelete._id) resetForm();
      setCategoryToDelete(null);
    } catch (error) {
      showToast({ type: "error", title: "حذف ناموفق", description: error instanceof Error ? error.message : undefined });
    }
  }

  /** Find parent name for display */
  function getParentName(parentId?: string | null): string | null {
    if (!parentId) return null;
    const parent = (allCategories.data?.items ?? []).find((c) => c._id === parentId);
    return parent?.name ?? null;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-slate-900">مدیریت دسته‌بندی‌ها</h1>
        <p className="mt-1 text-sm text-slate-500">ایجاد، ویرایش، حذف و جستجو در دسته‌بندی‌ها</p>
      </div>

      {/* Add/Edit Form */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          {editingCategory ? <Edit3 className="h-4 w-4 text-emerald-600" /> : <Plus className="h-4 w-4 text-emerald-600" />}
          <span className="text-sm font-bold text-slate-700">{editingCategory ? "ویرایش دسته‌بندی" : "افزودن دسته‌بندی جدید"}</span>
        </div>
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
          {/* ── Basic ─────────────────── */}
          <div className="flex items-center gap-2 md:col-span-2">
            <div className="h-1 flex-1 rounded-full bg-slate-200" />
            <span className="shrink-0 text-xs font-bold text-slate-400">اطلاعات پایه</span>
            <div className="h-1 flex-1 rounded-full bg-slate-200" />
          </div>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-600">نام دسته‌بندی (فارسی)</span>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: موبایل" required />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-600">اسلاگ انگلیسی</span>
            <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })} placeholder="مثال: mobile" required dir="ltr" className="text-left" />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-semibold text-slate-600">توضیحات</span>
            <textarea
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="توضیح کوتاه درباره دسته‌بندی..."
              className="min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-right text-sm outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
            />
          </label>

          {/* ── Display ───────────────── */}
          <div className="flex items-center gap-2 md:col-span-2">
            <div className="h-1 flex-1 rounded-full bg-slate-200" />
            <span className="shrink-0 text-xs font-bold text-slate-400">نمایش و ساختار</span>
            <div className="h-1 flex-1 rounded-full bg-slate-200" />
          </div>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-600">آیکون (ایموجی)</span>
            <Input
              value={form.icon ?? ""}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              placeholder="مثال: 📱"
              className="w-20 text-center text-2xl"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-600">تصویر (URL)</span>
            <Input
              value={form.image ?? ""}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
              placeholder="https://..."
              dir="ltr"
              className="text-left"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-600">دسته‌بندی والد</span>
            <select
              value={form.parentId ?? ""}
              onChange={(e) => setForm({ ...form, parentId: e.target.value || null })}
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-right text-sm"
            >
              <option value="">بدون والد (ریشه)</option>
              {rootCategories.map((cat) => (
                <option key={cat._id} value={cat._id}>{cat.icon ? `${cat.icon} ` : ""}{cat.name}</option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-600">ترتیب نمایش</span>
            <Input
              type="number"
              value={form.sortOrder ?? 0}
              onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
              placeholder="0"
              min={0}
            />
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isActive ?? true}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className="text-sm font-semibold text-slate-600">فعال و قابل مشاهده برای مشتریان</span>
          </label>

          {/* ── Actions ───────────────── */}
          <div className="flex items-center gap-2 md:col-span-2">
            <button type="submit" disabled={isSubmitting} className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-600 disabled:opacity-60">
              {isSubmitting ? "..." : editingCategory ? "ذخیره تغییرات" : "افزودن دسته‌بندی"}
            </button>
            {editingCategory && (
              <button type="button" onClick={resetForm} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                لغو
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Search */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="جستجو بر اساس نام یا اسلاگ..." className="pr-10" />
          </div>
          <button onClick={() => { setQuery(""); setPage(1); }} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" /> پاک‌کردن
          </button>
        </div>
      </div>

      {categories.isError ? (
        <ErrorState title="امکان دریافت دسته‌بندی‌ها نیست" description="لطفاً دوباره تلاش کنید." actions={<Button type="button" variant="outline" onClick={() => categories.refetch()}>تلاش مجدد</Button>} />
      ) : null}

      {!categories.isError && (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <FolderTree className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">فهرست دسته‌بندی‌ها</span>
            </div>
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">{formatNumber(totalItems)} مورد</span>
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full min-w-[860px] text-right text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-400">آیکون</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-400">نام</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-400">اسلاگ</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-400">والد</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-400">ترتیب</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-400">وضعیت</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-400">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {categories.isLoading ? Array.from({ length: 4 }).map((_, index) => <tr key={index}><td className="p-5" colSpan={7}><Skeleton className="h-12 w-full rounded-xl" /></td></tr>) : null}
                {!categories.isLoading && paginatedCategories.map((category) => (
                  <motion.tr key={category._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="transition hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 text-2xl">{category.icon ?? "📦"}</td>
                    <td className="px-5 py-3.5 font-bold text-slate-800">{category.name}</td>
                    <td className="px-5 py-3.5 ltr text-left font-mono text-sm text-slate-500">{category.slug}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-600">{getParentName(category.parentId) ?? "—"}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-600">{category.sortOrder ?? 0}</td>
                    <td className="px-5 py-3.5">
                      {category.isActive !== false ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"><Eye className="h-3 w-3" /> فعال</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500"><EyeOff className="h-3 w-3" /> غیرفعال</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => startEdit(category)} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200">
                          <Edit3 className="h-3 w-3" /> ویرایش
                        </button>
                        <button onClick={() => setCategoryToDelete(category)} disabled={deleteCategory.isPending} className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100">
                          <Trash2 className="h-3 w-3" /> حذف
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden divide-y divide-slate-50">
            {categories.isLoading ? Array.from({ length: 3 }).map((_, index) => <div key={index} className="p-4"><Skeleton className="h-16 w-full rounded-xl" /></div>) : null}
            {!categories.isLoading && paginatedCategories.map((category) => (
              <div key={category._id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{category.icon ?? "📦"}</span>
                  <div>
                    <p className="font-bold text-slate-800">{category.name}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-xs text-slate-400 ltr text-left font-mono">{category.slug}</span>
                      {category.parentId ? <span className="text-xs text-slate-400">← {getParentName(category.parentId)}</span> : null}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {category.isActive !== false ? (
                    <span className="rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">فعال</span>
                  ) : (
                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">غیرفعال</span>
                  )}
                  <button onClick={() => startEdit(category)} className="rounded-lg bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200"><Edit3 className="h-4 w-4" /></button>
                  <button onClick={() => setCategoryToDelete(category)} disabled={deleteCategory.isPending} className="rounded-lg bg-red-50 p-2 text-red-500 transition hover:bg-red-100"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>

          {!categories.isLoading && totalItems === 0 ? (
            <div className="p-8"><EmptyState title="دسته‌بندی‌ای یافت نشد" description="عبارت جستجو را تغییر دهید یا دسته‌بندی جدید بسازید." actions={<Button type="button" onClick={() => { setQuery(""); setPage(1); }}>پاک‌کردن</Button>} /></div>
          ) : null}
          {!categories.isLoading && totalItems > 0 ? <AdminPagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={PAGE_SIZE} onPageChange={setPage} /> : null}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(categoryToDelete)}
        title="حذف دسته‌بندی"
        description={`آیا از حذف دسته‌بندی «${categoryToDelete?.name ?? ""}» مطمئن هستید؟`}
        confirmText="حذف دسته‌بندی"
        destructive
        loading={deleteCategory.isPending}
        onConfirm={removeCategory}
        onCancel={() => setCategoryToDelete(null)}
      />
    </div>
  );
}
