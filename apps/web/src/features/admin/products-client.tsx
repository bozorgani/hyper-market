"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, Plus, Edit3, Trash2, RefreshCw, Package } from "lucide-react";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { ProductStatusBadge } from "@/components/admin/admin-status-badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useAdminProducts, useDeleteProduct } from "@/features/admin/admin-api";
import { useAdminProductSearch } from "@/hooks/use-search";
import { formatNumber, formatPrice } from "@/lib/utils";

const PAGE_SIZE = 10;

export function AdminProductsClient() {
  const [query, setQuery] = useState("");
  const [minStock, setMinStock] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string } | null>(null);
  const { showToast } = useToast();
  const isSearchMode = Boolean(query.trim() || minStock || maxPrice);
  const products = useAdminProducts(page, statusFilter === "all" ? undefined : statusFilter === "active", 10);
  const search = useAdminProductSearch({ q: query, minStock: minStock || undefined, maxPrice: maxPrice || undefined, page, limit: PAGE_SIZE });
  const deleteProduct = useDeleteProduct();
  const sourceError = isSearchMode ? search.error : products.error;
  const sourceErrorMessage = sourceError instanceof Error ? sourceError.message : "دریافت اطلاعات محصولات ناموفق بود.";
  const isLoading = isSearchMode ? search.isLoading : products.isLoading;

  const rows = useMemo(() => {
    if (isSearchMode) {
      return (search.data?.items ?? []).map((item) => ({ id: item.id, name: item.name, price: item.price, stock: item.stock, isActive: undefined as boolean | undefined }));
    }
    return (products.data?.items ?? []).map((item) => ({
      id: item._id, name: item.name, price: item.discountPrice ?? item.price, stock: item.stock, isActive: item.isActive,
    }));
  }, [isSearchMode, products.data?.items, search.data?.items]);

  const totalItems = isSearchMode ? (search.data?.total ?? 0) : (products.data?.total ?? 0);
  const totalPages = isSearchMode ? (search.data?.meta?.totalPages ?? Math.max(1, Math.ceil(totalItems / PAGE_SIZE))) : (products.data?.meta?.totalPages ?? Math.max(1, Math.ceil(totalItems / PAGE_SIZE)));
  const paginatedRows = rows;

  function resetFilters() { setQuery(""); setMinStock(""); setMaxPrice(""); setStatusFilter("all"); setPage(1); }

  async function confirmDeleteProduct() {
    if (!productToDelete) return;
    try {
      await deleteProduct.mutateAsync(productToDelete.id);
      showToast({ type: "success", title: "محصول حذف شد" });
      setProductToDelete(null);
    } catch (error) {
      showToast({ type: "error", title: "حذف محصول ناموفق بود", description: error instanceof Error ? error.message : undefined });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">مدیریت محصولات</h1>
          <p className="mt-1 text-sm text-slate-500">ایجاد، ویرایش، حذف و به‌روزرسانی موجودی</p>
        </div>
        <Link href="/admin/products/new" className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-600">
          <Plus className="h-4 w-4" />
          محصول جدید
        </Link>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto_auto]">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="جستجو بر اساس نام محصول..." className="pr-10" />
          </div>
          <Input value={minStock} onChange={(e) => { setMinStock(e.target.value); setPage(1); }} type="number" placeholder="حداقل موجودی" />
          <Input value={maxPrice} onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }} type="number" placeholder="حداکثر قیمت" />
          <select value={statusFilter} disabled={isSearchMode} onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setPage(1); }} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm disabled:bg-slate-50 disabled:text-slate-400">
            <option value="all">همه وضعیت‌ها</option>
            <option value="active">فقط فعال</option>
            <option value="inactive">فقط غیرفعال</option>
          </select>
          <button onClick={resetFilters} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" />
            پاک‌کردن
          </button>
        </div>
        {isSearchMode && <p className="mt-3 text-xs text-amber-600">در حالت جستجو، فیلتر وضعیت غیرفعال می‌شود.</p>}
      </div>

      {sourceError ? (
        <ErrorState title="بارگذاری محصولات انجام نشد" description={sourceErrorMessage} actions={<Button type="button" variant="outline" onClick={() => (isSearchMode ? search.refetch() : products.refetch())}>تلاش مجدد</Button>} />
      ) : null}

      {!sourceError && (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">{isSearchMode ? "نتایج جستجو" : "فهرست محصولات"}</span>
            </div>
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">{formatNumber(totalItems)} مورد</span>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[860px] text-right text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-400">نام محصول</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-400">قیمت</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-400">موجودی</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-400">وضعیت</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-400">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? Array.from({ length: 5 }).map((_, index) => <tr key={index}><td className="p-5" colSpan={5}><Skeleton className="h-12 w-full rounded-xl" /></td></tr>) : null}
                {!isLoading && paginatedRows.map((product) => (
                  <motion.tr key={product.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="transition hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 font-bold text-slate-800">{product.name}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-700">{formatPrice(product.price)}</td>
                    <td className="px-5 py-3.5">
                      <span className={product.stock < 10 ? "text-red-600 font-semibold" : "text-slate-700"}>
                        {formatNumber(product.stock)}
                        {product.stock < 10 && <span className="mr-1 text-xs">!</span>}
                      </span>
                    </td>
                    <td className="px-5 py-3.5"><ProductStatusBadge isActive={product.isActive} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/products/${product.id}`} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200">
                          <Edit3 className="h-3 w-3" /> ویرایش
                        </Link>
                        <button onClick={() => setProductToDelete({ id: product.id, name: product.name })} className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100">
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
          <div className="md:hidden divide-y divide-slate-50">
            {isLoading ? Array.from({ length: 3 }).map((_, index) => <div key={index} className="p-4"><Skeleton className="h-24 w-full rounded-xl" /></div>) : null}
            {!isLoading && paginatedRows.map((product) => (
              <div key={product.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-slate-800">{product.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{formatPrice(product.price)}</p>
                  </div>
                  <ProductStatusBadge isActive={product.isActive} />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-slate-500">موجودی: <span className="font-semibold text-slate-700">{formatNumber(product.stock)}</span></span>
                  <div className="flex gap-2">
                    <Link href={`/admin/products/${product.id}`} className="rounded-lg bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200"><Edit3 className="h-4 w-4" /></Link>
                    <button onClick={() => setProductToDelete({ id: product.id, name: product.name })} className="rounded-lg bg-red-50 p-2 text-red-500 transition hover:bg-red-100"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!isLoading && totalItems === 0 ? (
            <div className="p-8"><EmptyState title="محصولی یافت نشد" description="فیلترها یا عبارت جستجو را تغییر دهید." actions={<Button type="button" onClick={resetFilters}>پاک‌کردن فیلترها</Button>} /></div>
          ) : null}
          {!isLoading && totalItems > 0 ? <AdminPagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={PAGE_SIZE} onPageChange={setPage} /> : null}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(productToDelete)}
        title="حذف محصول"
        description={`آیا از حذف محصول «${productToDelete?.name ?? ""}» مطمئن هستید؟`}
        confirmText="حذف محصول"
        destructive
        loading={deleteProduct.isPending}
        onConfirm={confirmDeleteProduct}
        onCancel={() => setProductToDelete(null)}
      />
    </div>
  );
}