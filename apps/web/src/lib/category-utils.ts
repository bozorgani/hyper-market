import type { Category } from "@/types/domain";

type CategoryLike = Partial<Category> & {
  id?: string | null;
  href?: string | null;
};

export function getCategoryId(category: CategoryLike): string | undefined {
  const rawId = category._id ?? category.id;
  return typeof rawId === "string" && rawId.trim().length > 0 ? rawId.trim() : undefined;
}

export function getCategoryProductsHref(category: CategoryLike): string {
  if (category.href) return category.href;

  const id = getCategoryId(category);
  if (id) return `/products?categoryId=${encodeURIComponent(id)}`;

  if (category.slug) return `/products?search=${encodeURIComponent(category.slug)}`;
  if (category.name) return `/products?search=${encodeURIComponent(category.name)}`;

  return "/products";
}
