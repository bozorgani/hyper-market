import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetailPageClient } from "@/features/public-pages/product-detail-page-client";
import { fetchProductForMetadata } from "@/lib/server-api";
import { formatPrice } from "@/lib/utils";

type ProductDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await fetchProductForMetadata(id);

  if (!product) {
    return {
      title: "محصول یافت نشد",
      description: "محصول مورد نظر در هایپرمارکت یافت نشد یا در حال حاضر فعال نیست.",
      robots: { index: false, follow: false },
    };
  }

  const price = product.discountPrice ?? product.price;
  const description = product.description || `${product.name} با قیمت ${formatPrice(price)} در هایپرمارکت`;
  const image = product.images?.[0];

  return {
    title: product.name,
    description,
    alternates: { canonical: `/products/${id}` },
    openGraph: {
      type: "website",
      title: product.name,
      description,
      images: image ? [{ url: image, alt: product.name }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: product.name,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  const product = await fetchProductForMetadata(id);
  if (!product) {
    notFound();
  }

  return <ProductDetailPageClient productId={id} initialProduct={product} />;
}
