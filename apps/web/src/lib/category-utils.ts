import type { Category } from "@/types/domain";

type CategoryLike = Partial<Category> & {
  id?: string | null;
  href?: string | null;
};

export type CategoryLinkItem = CategoryLike & {
  _id: string;
  name: string;
  icon?: string | null;
  href: string;
};

export const fallbackCategories: CategoryLinkItem[] = [
  { _id: "fallback-dairy", name: "لبنیات", slug: "dairy", icon: "🥛", href: "/products?search=لبنیات" },
  { _id: "fallback-protein", name: "پروتئین", slug: "protein", icon: "🥩", href: "/products?search=گوشت" },
  { _id: "fallback-drinks", name: "نوشیدنی", slug: "drinks", icon: "🥤", href: "/products?search=نوشیدنی" },
  { _id: "fallback-snacks", name: "تنقلات", slug: "snacks", icon: "🍿", href: "/products?search=تنقلات" },
  { _id: "fallback-fruits", name: "میوه", slug: "fruits", icon: "🍎", href: "/products?search=میوه" },
  { _id: "fallback-bakery", name: "نان", slug: "bakery", icon: "🥖", href: "/products?search=نان" },
  { _id: "fallback-cleaning", name: "شوینده", slug: "cleaning", icon: "🧼", href: "/products?search=شوینده" },
  { _id: "fallback-canned", name: "کنسرو", slug: "canned", icon: "🥫", href: "/products?search=کنسرو" },
];

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
