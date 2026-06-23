"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAdminCategories } from "@/features/admin/admin-api";

export default function AdminCategoriesPage() {
  const categories = useAdminCategories();

  return (
    <main className="space-y-5 text-right">
      <div>
        <h1 className="text-2xl font-black">مدیریت دسته‌بندی‌ها</h1>
        <p className="mt-2 text-sm text-slate-500">
          دسته‌بندی‌ها از API موجود بک‌اند دریافت می‌شوند. در حال حاضر فقط endpoint لیست دسته‌بندی‌ها در بک‌اند وجود دارد.
        </p>
      </div>

      <Card className="border-amber-200 bg-amber-50 p-5 text-amber-800">
        <h2 className="font-black">ایجاد، ویرایش و حذف دسته‌بندی هنوز API ندارد</h2>
        <p className="mt-2 text-sm leading-7">
          برای جلوگیری از ارسال درخواست اشتباه، فرم‌های CRUD غیرفعال هستند تا زمانی که endpointهای POST /categories، PUT /categories/:id و DELETE /categories/:id در بک‌اند اضافه شوند.
        </p>
      </Card>

      <Card className="p-5 opacity-60">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <Input placeholder="نام دسته‌بندی" disabled />
          <Input placeholder="اسلاگ دسته‌بندی" disabled />
          <Button disabled>افزودن دسته‌بندی</Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-right text-sm">
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
                      <Button variant="outline" disabled>ویرایش</Button>
                      <Button variant="destructive" disabled>حذف</Button>
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
