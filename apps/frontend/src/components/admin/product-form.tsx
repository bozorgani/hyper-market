"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Product } from "@/types/domain";
import type { ProductFormInput } from "@/features/admin/admin-api";
import { useAdminCategories } from "@/features/admin/admin-api";

export function ProductForm({
  initialProduct,
  onSubmit,
  loading,
}: {
  initialProduct?: Product;
  onSubmit: (input: ProductFormInput) => void;
  loading?: boolean;
}) {
  const categories = useAdminCategories();
  const [form, setForm] = useState<ProductFormInput>({
    name: "",
    description: "",
    price: 0,
    discountPrice: undefined,
    stock: 0,
    images: [],
    categoryId: "",
    isActive: true,
  });

  useEffect(() => {
    if (initialProduct) {
      setForm({
        name: initialProduct.name,
        description: initialProduct.description,
        price: initialProduct.price,
        discountPrice: initialProduct.discountPrice ?? undefined,
        stock: initialProduct.stock,
        images: initialProduct.images ?? [],
        categoryId: String(initialProduct.categoryId),
        isActive: initialProduct.isActive,
      });
    }
  }, [initialProduct]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(form);
  }

  return (
    <Card className="p-5 text-right">
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-600">نام محصول</span>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-600">دسته‌بندی</span>
          <select
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-right text-sm"
            required
          >
            <option value="">انتخاب دسته‌بندی</option>
            {(categories.data ?? []).map((category) => (
              <option key={category._id} value={category._id}>{category.name}</option>
            ))}
          </select>
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-slate-600">توضیحات</span>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="min-h-28 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-right text-sm outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
            required
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-600">قیمت</span>
          <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} required />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-600">قیمت تخفیفی</span>
          <Input type="number" value={form.discountPrice ?? ""} onChange={(e) => setForm({ ...form, discountPrice: e.target.value ? Number(e.target.value) : undefined })} />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-600">موجودی</span>
          <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} required />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-600">آدرس تصویر</span>
          <Input placeholder="UI آپلود تصویر در آینده" onChange={(e) => setForm({ ...form, images: e.target.value ? [e.target.value] : [] })} />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
          <span className="text-sm font-semibold text-slate-600">فعال باشد</span>
        </label>
        <div className="md:col-span-2">
          <Button disabled={loading}>{loading ? "در حال ذخیره..." : "ذخیره محصول"}</Button>
        </div>
      </form>
    </Card>
  );
}
