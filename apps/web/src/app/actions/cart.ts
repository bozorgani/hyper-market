"use server";

import { revalidatePath } from "next/cache";
import { backendFetch } from "./backend";
import type { CartSummary } from "@/types/domain";

export async function addToCartAction(input: { productId: string; quantity: number }): Promise<CartSummary> {
  const result = await backendFetch<CartSummary>("/cart/add", {
    method: "POST",
    body: JSON.stringify(input),
  });
  revalidatePath("/cart");
  return result;
}

export async function updateCartQuantityAction(input: { productId: string; quantity: number }): Promise<CartSummary> {
  const result = await backendFetch<CartSummary>("/cart/update", {
    method: "POST",
    body: JSON.stringify(input),
  });
  revalidatePath("/cart");
  return result;
}

export async function removeFromCartAction(productId: string): Promise<CartSummary> {
  const result = await backendFetch<CartSummary>("/cart/remove", {
    method: "POST",
    body: JSON.stringify({ productId }),
  });
  revalidatePath("/cart");
  return result;
}

export async function clearCartAction(): Promise<void> {
  await backendFetch("/cart/clear", {
    method: "POST",
    body: JSON.stringify({}),
  });
  revalidatePath("/cart");
}
