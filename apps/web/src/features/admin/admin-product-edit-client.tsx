"use client";


import { useParams, useRouter } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { useAdminProduct, useUpdateProduct } from "@/features/admin/admin-api";

export function AdminProductEditClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const product = useAdminProduct(params.id);
  const updateProduct = useUpdateProduct(params.id);

  return (
    <main id="main-content" className="space-y-5 text-right">
      <h1 className="text-2xl font-black">ویرایش محصول</h1>
      {product.isLoading ? <p className="text-slate-500">در حال بارگذاری...</p> : null}
      {product.isError ? (
        <ErrorState
          title="بارگذاری محصول انجام نشد"
          description={product.error instanceof Error ? product.error.message : "دریافت اطلاعات محصول ناموفق بود."}
          actions={<Button type="button" variant="outline" onClick={() => product.refetch()}>تلاش مجدد</Button>}
        />
      ) : null}
      {product.data ? (
        <ProductForm
          key={product.data._id}
          initialProduct={product.data}
          loading={updateProduct.isPending}
          error={updateProduct.error instanceof Error ? updateProduct.error.message : undefined}
          onSubmit={(input) => updateProduct.mutate(input, { onSuccess: () => router.push("/admin/products") })}
        />
      ) : null}
    </main>
  );
}
