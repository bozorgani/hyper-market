"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  CategoryFormInput,
  useAdminCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from "@/features/admin/admin-api";
import type { Category } from "@/types/domain";

const emptyForm: CategoryFormInput = {
  name: "",
  slug: "",
};

export default function AdminCategoriesPage() {
  const categories = useAdminCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const [form, setForm] = useState<CategoryFormInput>(emptyForm);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [message, setMessage] = useState("");

  const isSubmitting = createCategory.isPending || updateCategory.isPending;

  function resetForm() {
    setForm(emptyForm);
    setEditingCategory(null);
  }

  function startEdit(category: Category) {
    setMessage("");
    setEditingCategory(category);
    setForm({
      name: category.name,
      slug: category.slug,
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({ id: editingCategory._id, input: form });
        setMessage("دسته‌بندی با موفقیت ویرایش شد.");
      } else {
        await createCategory.mutateAsync(form);
        setMessage("دسته‌بندی با موفقیت ایجاد شد.");
      }
      resetForm();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "عملیات دسته‌بندی ناموفق بود.");
    }
  }

  async function removeCategory(categoryId: string) {
    setMessage("");

    try {
      await deleteCategory.mutateAsync(categoryId);
      setMessage("دسته‌بندی با موفقیت حذف شد.");
      if (editingCategory?._id === categoryId) {
        resetForm();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "حذف دسته‌بندی ناموفق بود.");
    }
  }

  return (
    <main className="space-y-5 text-right">
      <div>
        <h1 className="text-2xl font-black">مدیریت دسته‌بندی‌ها</h1>
        <p className="mt-2 text-sm text-slate-500">
          ایجاد، ویرایش، حذف نرم و مشاهده دسته‌بندی‌های فروشگاه
        </p>
      </div>

      <Card className="p-5">
        <form onSubmit={submit} className="grid gap-3 lg:grid-cols-[1fr_1fr_auto_auto]">
          <Input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="نام دسته‌بندی"
            required
          />
          <Input
            value={form.slug}
            onChange={(event) => setForm({ ...form, slug: event.target.value.toLowerCase() })}
            placeholder="اسلاگ انگلیسی مثل mobile"
            required
          />
          <Button disabled={isSubmitting}>{editingCategory ? "ذخیره ویرایش" : "افزودن دسته‌بندی"}</Button>
          {editingCategory ? <Button type="button" variant="outline" onClick={resetForm}>لغو</Button> : null}
        </form>
        {message ? <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">{message}</p> : null}
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-right text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="p-4">نام</th>
                <th className="p-4">اسلاگ</th>
                <th className="p-4">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.isLoading ? (
                <tr>
                  <td className="p-4 text-slate-500" colSpan={3}>در حال بارگذاری دسته‌بندی‌ها...</td>
                </tr>
              ) : null}
              {categories.isError ? (
                <tr>
                  <td className="p-4 text-red-600" colSpan={3}>امکان دریافت دسته‌بندی‌ها وجود ندارد.</td>
                </tr>
              ) : null}
              {(categories.data ?? []).map((category) => (
                <tr key={category._id}>
                  <td className="p-4 font-bold">{category.name}</td>
                  <td className="p-4 ltr text-left">{category.slug}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => startEdit(category)}>ویرایش</Button>
                      <Button variant="destructive" onClick={() => removeCategory(category._id)} disabled={deleteCategory.isPending}>حذف</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {categories.data?.length === 0 ? (
                <tr>
                  <td className="p-4 text-slate-500" colSpan={3}>هنوز دسته‌بندی ثبت نشده است.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
}
