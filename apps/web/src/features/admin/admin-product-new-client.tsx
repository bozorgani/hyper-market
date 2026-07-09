"use client";


import { useRouter } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { useCreateProduct } from "@/features/admin/admin-api";

export function AdminProductNewClient() {
  const router = useRouter();
  const createProduct = useCreateProduct();

  return (
    <main className="space-y-5 text-right">
      <h1 className="text-2xl font-black">ایجاد محصول جدید</h1>
      <ProductForm
        loading={createProduct.isPending}
        onSubmit={(input) => createProduct.mutate(input, { onSuccess: () => router.push("/admin/products") })}
      />
    </main>
  );
}
