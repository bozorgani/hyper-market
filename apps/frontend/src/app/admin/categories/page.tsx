"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAdminCategories } from "@/features/admin/admin-api";

export default function AdminCategoriesPage() {
  const categories = useAdminCategories();
  const [name, setName] = useState("");
  const [localCategories, setLocalCategories] = useState<Array<{ name: string; slug: string }>>([]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    setLocalCategories([...localCategories, { name, slug: name.trim().replaceAll(" ", "-") }]);
    setName("");
  }

  return (
    <main className="space-y-5 text-right">
      <div>
        <h1 className="text-2xl font-black">مدیریت دسته‌بندی‌ها</h1>
        <p className="mt-2 text-sm text-slate-500">لیست دسته‌بندی‌ها از بک‌اند دریافت می‌شود؛ ایجاد/ویرایش تا آماده شدن API به‌صورت UI نمایش داده می‌شود.</p>
      </div>
      <Card className="p-5">
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="نام دسته‌بندی جدید" />
          <Button>افزودن نمایشی</Button>
        </form>
      </Card>
      <Card className="overflow-hidden">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">نام</th><th className="p-4">اسلاگ</th><th className="p-4">عملیات</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {[...(categories.data ?? []), ...localCategories.map((item, index) => ({ _id: `local-${index}`, ...item }))].map((category) => (
              <tr key={category._id}>
                <td className="p-4 font-bold">{category.name}</td>
                <td className="p-4 ltr text-left">{category.slug}</td>
                <td className="p-4"><Button variant="outline" disabled>ویرایش / حذف پس از API</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </main>
  );
}
