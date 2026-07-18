"use client";

import { FormEvent, useState } from "react";
import { ProductImageManager } from "@/components/admin/product-image-manager";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusMessage } from "@/components/ui/status-message";
import { firstValidationError } from "@/lib/validation/auth";
import { productFormSchema } from "@/lib/validation/product";
import type { Product } from "@/types/domain";
import type { ProductFormInput } from "@/features/admin/admin-api";
import { useAdminCategories } from "@/features/admin/admin-api";

export function ProductForm({
  initialProduct,
  onSubmit,
  loading,
  error,
}: {
  initialProduct?: Product;
  onSubmit: (input: ProductFormInput) => void;
  loading?: boolean;
  error?: string;
}) {
  const categories = useAdminCategories();
  const [form, setForm] = useState<ProductFormInput>({
    name: initialProduct?.name ?? "",
    description: initialProduct?.description ?? "",
    price: initialProduct?.price ?? 0,
    discountPrice: initialProduct?.discountPrice ?? undefined,
    stock: initialProduct?.stock ?? 0,
    images: initialProduct?.images ?? [],
    categoryId: initialProduct ? String(initialProduct.categoryId) : "",
    isActive: initialProduct?.isActive ?? true,
    brand: initialProduct?.brand ?? "",
    sku: initialProduct?.sku ?? "",
    unit: initialProduct?.unit ?? "",
    weight: initialProduct?.weight ?? undefined,
    tags: initialProduct?.tags ?? [],
  });

  // Tags input state
  const [tagInput, setTagInput] = useState("");
  const [validationError, setValidationError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError("");

    const validation = productFormSchema.safeParse(form);
    if (!validation.success) {
      setValidationError(firstValidationError(validation.error));
      return;
    }

    // Clean empty optional strings so they do not overwrite values with empty strings.
    const cleaned: ProductFormInput = {
      ...form,
      brand: form.brand?.trim() || undefined,
      sku: form.sku?.trim() || undefined,
      unit: form.unit?.trim() || undefined,
      weight: form.weight && form.weight > 0 ? form.weight : undefined,
      tags: form.tags && form.tags.length > 0 ? form.tags : undefined,
    };
    onSubmit(cleaned);
  }

  function addTag() {
    const tag = tagInput.trim();
    if (tag && !form.tags?.includes(tag)) {
      setForm({ ...form, tags: [...(form.tags ?? []), tag] });
      setTagInput("");
    }
  }

  function removeTag(tag: string) {
    setForm({ ...form, tags: (form.tags ?? []).filter((t) => t !== tag) });
  }

  function handleTagKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  }

  return (
    <Card className="p-5 text-right">
      {error || validationError ? (
        <div className="mb-4">
          <StatusMessage variant="error">{validationError || error}</StatusMessage>
        </div>
      ) : null}
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        {/* ── Basic Info ─────────────────────────────────────── */}
        <div className="flex items-center gap-2 md:col-span-2">
          <div className="h-1 flex-1 rounded-full bg-slate-200" />
          <span className="shrink-0 text-xs font-bold text-slate-400">اطلاعات پایه</span>
          <div className="h-1 flex-1 rounded-full bg-slate-200" />
        </div>

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
            {(categories.data?.items ?? []).map((category) => (
              <option key={category._id} value={category._id}>{category.name}</option>
            ))}
          </select>
          {(categories.data?.items.length ?? 0) === 0 ? (
            <p className="text-xs leading-5 text-amber-600">برای ساخت محصول باید ابتدا حداقل یک دسته‌بندی در دیتابیس وجود داشته باشد.</p>
          ) : null}
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

        {/* ── Pricing ────────────────────────────────────────── */}
        <div className="flex items-center gap-2 md:col-span-2">
          <div className="h-1 flex-1 rounded-full bg-slate-200" />
          <span className="shrink-0 text-xs font-bold text-slate-400">قیمت‌گذاری</span>
          <div className="h-1 flex-1 rounded-full bg-slate-200" />
        </div>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-600">قیمت</span>
          <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} required />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-600">قیمت تخفیفی</span>
          <Input type="number" value={form.discountPrice ?? ""} onChange={(e) => setForm({ ...form, discountPrice: e.target.value ? Number(e.target.value) : undefined })} />
        </label>

        {/* ── Inventory & Warehouse ───────────────────────────── */}
        <div className="flex items-center gap-2 md:col-span-2">
          <div className="h-1 flex-1 rounded-full bg-slate-200" />
          <span className="shrink-0 text-xs font-bold text-slate-400">انبار و موجودی</span>
          <div className="h-1 flex-1 rounded-full bg-slate-200" />
        </div>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-600">موجودی</span>
          <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} required />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-600">کد انبار (SKU)</span>
          <Input
            value={form.sku ?? ""}
            onChange={(e) => setForm({ ...form, sku: e.target.value })}
            placeholder="مثال: SAM-GAL-S24-128"
            dir="ltr"
            className="text-left"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-600">برند</span>
          <Input
            value={form.brand ?? ""}
            onChange={(e) => setForm({ ...form, brand: e.target.value })}
            placeholder="مثال: Samsung"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-600">واحد اندازه‌گیری</span>
          <select
            value={form.unit ?? ""}
            onChange={(e) => setForm({ ...form, unit: e.target.value || undefined })}
            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-right text-sm"
          >
            <option value="">بدون واحد</option>
            <option value="عدد">عدد</option>
            <option value="کیلوگرم">کیلوگرم</option>
            <option value="گرم">گرم</option>
            <option value="لیتر">لیتر</option>
            <option value="متر">متر</option>
            <option value="بسته">بسته</option>
            <option value="جعبه">جعبه</option>
            <option value="کارتن">کارتن</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-600">وزن (گرم)</span>
          <Input
            type="number"
            value={form.weight ?? ""}
            onChange={(e) => setForm({ ...form, weight: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="مثال: 196"
          />
        </label>

        {/* ── Tags ───────────────────────────────────────────── */}
        <div className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold text-slate-600">برچسب‌ها (Tags)</span>
          <div className="flex items-center gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="برچسب جدید و Enter"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={addTag}
              disabled={!tagInput.trim()}
              className="h-12 shrink-0 px-4"
            >
              افزودن
            </Button>
          </div>
          {form.tags && form.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {form.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="mr-0.5 text-slate-400 hover:text-red-500 transition"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {/* ── Images ─────────────────────────────────────────── */}
        <ProductImageManager images={form.images ?? []} onChange={(images) => setForm({ ...form, images })} disabled={loading} />

        {/* ── Status ─────────────────────────────────────────── */}
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
          <span className="text-sm font-semibold text-slate-600">فعال باشد</span>
        </label>

        <div className="md:col-span-2">
          <Button disabled={loading || !form.categoryId}>{loading ? "در حال ذخیره..." : "ذخیره محصول"}</Button>
        </div>
      </form>
    </Card>
  );
}
