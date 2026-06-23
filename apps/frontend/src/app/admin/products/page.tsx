"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatNumber, formatPrice } from "@/lib/utils";
import { useAdminProductSearch } from "@/hooks/use-search";
import { useAdminProducts, useDeleteProduct } from "@/features/admin/admin-api";

export default function AdminProductsPage() {
  const [query, setQuery] = useState("");
  const [minStock, setMinStock] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const products = useAdminProducts();
  const search = useAdminProductSearch({ q: query, minStock: minStock || undefined, maxPrice: maxPrice || undefined });
  const deleteProduct = useDeleteProduct();
  const rows = query.trim() || minStock || maxPrice
    ? (search.data ?? []).map((item) => ({
        id: item.id,
        name: item.title,
        price: item.price,
        stock: item.stock,
        isActive: item.stock > 0,
      }))
    : (products.data?.items ?? []).map((item) => ({
        id: item._id,
        name: item.name,
        price: item.discountPrice ?? item.price,
        stock: item.stock,
        isActive: item.isActive,
      }));

  return (
    <main className="space-y-5 text-right">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black">مدیریت محصولات</h1>
          <p className="mt-2 text-sm text-slate-500">ایجاد، ویرایش، حذف، جستجو و به‌روزرسانی موجودی</p>
        </div>
        <Link href="/admin/products/new"><Button>محصول جدید</Button></Link>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جستجوی سریع محصول..." />
          <Input value={minStock} onChange={(e) => setMinStock(e.target.value)} type="number" placeholder="حداقل موجودی" />
          <Input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} type="number" placeholder="حداکثر قیمت" />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-right text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="p-4">نام</th>
                <th className="p-4">قیمت</th>
                <th className="p-4">موجودی</th>
                <th className="p-4">وضعیت</th>
                <th className="p-4">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((product) => (
                <tr key={product.id}>
                  <td className="p-4 font-bold">{product.name}</td>
                  <td className="p-4">{formatPrice(product.price)}</td>
                  <td className="p-4">{formatNumber(product.stock)}</td>
                  <td className="p-4"><Badge>{product.isActive ? "فعال" : "غیرفعال"}</Badge></td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Link href={`/admin/products/${product.id}`}><Button variant="outline">ویرایش</Button></Link>
                      <Button variant="destructive" onClick={() => deleteProduct.mutate(product.id)}>حذف</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
}
