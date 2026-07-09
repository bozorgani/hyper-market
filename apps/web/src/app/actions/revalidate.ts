"use server";

import { revalidatePath, revalidateTag } from "next/cache";

/**
 * Cache tag invalidation helpers – Issue #18
 * Centralizes Next.js App Router cache revalidation.
 * RevalidateTag is preferred over revalidatePath for granular control.
 *
 * Next.js 16+: revalidateTag(tag, profile) – profile = "max" purges immediately
 * across all cache lifetimes.
 */

const PROFILE = "max";

export async function revalidateProducts(): Promise<void> {
  revalidateTag("products", PROFILE);
  revalidatePath("/products", "page");
  revalidatePath("/", "page");
}

export async function revalidateProduct(id: string): Promise<void> {
  revalidateTag("products", PROFILE);
  revalidateTag(`product:${id}`, PROFILE);
  revalidatePath(`/products/${id}`, "page");
  revalidatePath("/products", "page");
}

export async function revalidateCategories(): Promise<void> {
  revalidateTag("categories", PROFILE);
  revalidatePath("/categories", "page");
  revalidatePath("/", "page");
}

export async function revalidateCategory(id: string): Promise<void> {
  revalidateTag("categories", PROFILE);
  revalidateTag(`category:${id}`, PROFILE);
  revalidatePath("/categories", "page");
}

export async function revalidateSearch(): Promise<void> {
  revalidateTag("search", PROFILE);
  revalidatePath("/search", "page");
}

export async function revalidateCart(): Promise<void> {
  revalidateTag("cart", PROFILE);
  revalidatePath("/cart", "page");
}

export async function revalidateAllPublic(): Promise<void> {
  revalidateTag("products", PROFILE);
  revalidateTag("categories", PROFILE);
  revalidateTag("search", PROFILE);
  revalidatePath("/", "layout");
}
