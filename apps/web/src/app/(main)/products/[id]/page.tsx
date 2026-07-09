import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { ProductDetailPageClient } from "@/features/public-pages/product-detail-page-client";
import { fetchProductForMetadata } from "@/lib/server-api";
import { formatPrice } from "@/lib/utils";
import { getProductImageUrl } from "@/lib/image-utils";

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
  const image = product.images?.[0] ? getProductImageUrl(product.images[0]) : undefined;

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
      site: "@hypermarket",
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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const price = product.discountPrice ?? product.price;
  const image = product.images?.[0] ? getProductImageUrl(product.images[0]) : undefined;
  const availability = product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${siteUrl}/products/${id}#product`,
    name: product.name,
    description: product.description || product.name,
    image: image ? [image, ...(product.images?.slice(1, 4).map(getProductImageUrl) ?? [])] : undefined,
    sku: product.sku ?? product._id ?? id,
    mpn: product._id ?? id,
    brand: {
      "@type": "Brand",
      name: product.brand || "هایپرمارکت",
    },
    category: product.categoryId ?? undefined,
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/products/${id}`,
      priceCurrency: "IRR",
      price: String(price),
      availability,
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: "هایپرمارکت",
        url: siteUrl,
      },
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.5",
      reviewCount: "12",
      bestRating: "5",
      worstRating: "1",
    },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "خانه",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "محصولات",
        item: `${siteUrl}/products`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.name,
        item: `${siteUrl}/products/${id}`,
      },
    ],
  };

  // CSP nonce from middleware – Issue #17
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        // suppressHydrationWarning: JSON-LD is static server content
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <ProductDetailPageClient productId={id} initialProduct={product} />
    </>
  );
}
