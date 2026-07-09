"use client";


import { useParams, useRouter } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { useAdminProduct, useUpdateProduct } from "@/features/admin/admin-api";

export function AdminProductEditClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const product = useAdminProduct(params.id);
  const updateProduct = useUpdateProduct(params.id);

  return (
    <main className="space-y-5 text-right">
      <h1 className="text-2xl font-black">ویرایش محصول</h1>
      {product.isLoading ? <p className="text-slate-500">در حال بارگذاری...</p> : null}
      {product.data ? (
        <ProductForm
          initialProduct={product.data}
          loading={updateProduct.isPending}
          onSubmit={(input) => updateProduct.mutate(input, { onSuccess: () => router.push("/admin/products") })}
        />
      ) : null}
    </main>
  );
}
