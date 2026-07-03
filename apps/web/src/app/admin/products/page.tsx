"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { ProductStatusBadge } from "@/components/admin/admin-status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useAdminProducts, useDeleteProduct } from "@/features/admin/admin-api";
import { useAdminProductSearch } from "@/hooks/use-search";
import { formatNumber, formatPrice } from "@/lib/utils";

const PAGE_SIZE = 10;

export default function AdminProductsPage() {
  const [query, setQuery] = useState("");
  const [minStock, setMinStock] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string } | null>(null);
  const { showToast } = useToast();
  const isSearchMode = Boolean(query.trim() || minStock || maxPrice);
  // statusFilter is forwarded to the server so pagination counts stay accurate
  // (the public list defaults to active-only; admin can request active/inactive/all).
  const products = useAdminProducts(
    page,
    statusFilter === "all" ? undefined : statusFilter === "active",
    10,
  );
  const search = useAdminProductSearch({ q: query, minStock: minStock || undefined, maxPrice: maxPrice || undefined });
  const deleteProduct = useDeleteProduct();
  const sourceError = isSearchMode ? search.error : products.error;
  const sourceErrorMessage = sourceError instanceof Error ? sourceError.message : "دریافت اطلاعات محصولات ناموفق بود.";
  const isLoading = isSearchMode ? search.isLoading : products.isLoading;

  const rows = useMemo(() => {
    if (isSearchMode) {
      return (search.data ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        stock: item.stock,
        isActive: undefined as boolean | undefined,
      }));
    }
    return (products.data?.items ?? []).map((item) => ({
      id: item._id,
      name: item.name,
      price: item.discountPrice ?? item.price,
      stock: item.stock,
      isActive: item.isActive,
    }));
  }, [isSearchMode, products.data?.items, search.data]);

  const totalItems = isSearchMode ? rows.length : (products.data?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  // Search results are not server-paginated, so paginate them client-side;
  // the default list already comes back as a single server page.
  const paginatedRows = useMemo(
    () => (isSearchMode ? rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : rows),
    [isSearchMode, rows, page],
  );

  function resetFilters() {
    setQuery("");
    setMinStock("");
    setMaxPrice("");
    setStatusFilter("all");
    setPage(1);
  }

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
    <main className="space-y-5 text-right">
      <PageHeader
        title="مدیریت محصولات"
        description="ایجاد، ویرایش، حذف، جستجو و به‌روزرسانی موجودی محصولات فروشگاه"
        badge={<Link href="/admin/products/new"><Button type="button">محصول جدید</Button></Link>}
      />

      <Card className="p-4">
        <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_auto]">
          <Input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="جستجو بر اساس نام محصول..." />
          <Input value={minStock} onChange={(e) => { setMinStock(e.target.value); setPage(1); }} type="number" placeholder="حداقل موجودی" />
          <Input value={maxPrice} onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }} type="number" placeholder="حداکثر قیمت" />
          <select value={statusFilter} disabled={isSearchMode} onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setPage(1); }} className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm disabled:bg-slate-100 disabled:text-slate-400">
            <option value="all">همه وضعیت‌ها</option>
            <option value="active">فقط فعال</option>
            <option value="inactive">فقط غیرفعال</option>
          </select>
          <Button type="button" variant="outline" onClick={resetFilters}>
            پاک‌کردن فیلترها
          </Button>
        </div>
        {isSearchMode ? <p className="mt-3 text-xs text-amber-600">در حالت جستجوی مدیریتی، وضعیت فعال/غیرفعال از API جستجو برنمی‌گردد؛ بنابراین فیلتر وضعیت غیرفعال می‌شود.</p> : null}
      </Card>

      {sourceError ? (
        <ErrorState
          title="بارگذاری محصولات انجام نشد"
          description={sourceErrorMessage}
          actions={<Button type="button" variant="outline" onClick={() => (isSearchMode ? search.refetch() : products.refetch())}>تلاش مجدد</Button>}
        />
      ) : null}

      {!sourceError ? (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 text-sm text-slate-500">
            <p>{isSearchMode ? "نتایج جستجوی مدیریتی" : "فهرست محصولات ثبت‌شده"}</p>
            <p>{formatNumber(totalItems)} مورد</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-right text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="p-4">نام</th>
                  <th className="p-4">قیمت</th>
                  <th className="p-4">موجودی</th>
                  <th className="p-4">وضعیت</th>
                  <th className="p-4">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index}><td className="p-4" colSpan={5}><Skeleton className="h-10 w-full" /></td></tr>
                )) : null}
                {!isLoading && paginatedRows.map((product) => (
                  <tr key={product.id} className="border-b border-slate-100 transition hover:bg-slate-50/80">
                    <td className="p-4 font-bold text-slate-900">{product.name}</td>
                    <td className="p-4">{formatPrice(product.price)}</td>
                    <td className="p-4">{formatNumber(product.stock)}</td>
                    <td className="p-4"><ProductStatusBadge isActive={product.isActive} /></td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/admin/products/${product.id}`}><Button type="button" variant="outline">ویرایش</Button></Link>
                        <Button type="button" variant="destructive" onClick={() => setProductToDelete({ id: product.id, name: product.name })}>حذف</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!isLoading && totalItems === 0 ? (
            <div className="p-4">
              <EmptyState title="محصولی یافت نشد" description="فیلترها یا عبارت جستجو را تغییر دهید تا نتیجه‌ای نمایش داده شود." actions={<Button type="button" onClick={resetFilters}>پاک‌کردن فیلترها</Button>} />
            </div>
          ) : null}
          {!isLoading && totalItems > 0 ? (
            <AdminPagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={PAGE_SIZE} onPageChange={setPage} />
          ) : null}
        </Card>
      ) : null}

      <ConfirmDialog
        open={Boolean(productToDelete)}
        title="حذف محصول"
        description={`آیا از حذف محصول «${productToDelete?.name ?? ""}» مطمئن هستید؟ این عملیات محصول را از فهرست مدیریتی حذف می‌کند.`}
        confirmText="حذف محصول"
        destructive
        loading={deleteProduct.isPending}
        onConfirm={confirmDeleteProduct}
        onCancel={() => setProductToDelete(null)}
      />
    </main>
  );
}
