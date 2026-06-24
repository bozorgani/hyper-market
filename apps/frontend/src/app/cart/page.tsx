"use client";

import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatNumber, formatPrice } from "@/lib/utils";
import { useCart, useClearCart, useRemoveFromCart, useUpdateCartQuantity } from "@/hooks/use-cart";

export default function CartPage() {
  const cart = useCart();
  const remove = useRemoveFromCart();
  const updateQuantity = useUpdateCartQuantity();
  const clear = useClearCart();
  const detailedItems = cart.data?.items ?? [];
  const isMutating = remove.isPending || updateQuantity.isPending;

  function decrementItem(productId: string, quantity: number) {
    if (quantity <= 1) {
      remove.mutate(productId);
      return;
    }

    updateQuantity.mutate({ productId, quantity: quantity - 1 });
  }

  function incrementItem(productId: string, quantity: number) {
    updateQuantity.mutate({ productId, quantity: quantity + 1 });
  }

  return (
    <ProtectedRoute>
      <main className="mx-auto max-w-4xl px-4 py-8 text-right">
        <h1 className="text-2xl font-black">سبد خرید من</h1>
        <Card className="mt-5 divide-y divide-slate-100 overflow-hidden">
          {detailedItems.length === 0 ? <p className="p-6 text-slate-500">سبد خرید شما خالی است.</p> : null}
          {detailedItems.map((item) => (
            <div key={item.productId} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                  {item.image ? "🛍️" : "🛒"}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{item.name}</p>
                  <p className="text-sm text-slate-500">موجودی: {formatNumber(item.stock)}</p>
                  <p className="text-sm font-bold text-rose-600">{formatPrice(item.lineTotal)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <div className="flex items-center rounded-2xl border border-slate-200 bg-white">
                  <Button
                    variant="ghost"
                    className="h-10 w-10 rounded-2xl px-0"
                    disabled={isMutating}
                    onClick={() => decrementItem(item.productId, item.quantity)}
                    aria-label="کاهش تعداد"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="min-w-10 text-center text-sm font-black">{formatNumber(item.quantity)}</span>
                  <Button
                    variant="ghost"
                    className="h-10 w-10 rounded-2xl px-0"
                    disabled={isMutating || item.quantity >= item.stock}
                    onClick={() => incrementItem(item.productId, item.quantity)}
                    aria-label="افزایش تعداد"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="outline" disabled={remove.isPending} onClick={() => remove.mutate(item.productId)}>حذف</Button>
              </div>
            </div>
          ))}
        </Card>
        <div className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-lg font-black"><span>مجموع</span><span>{formatPrice(cart.data?.totalPrice ?? 0)}</span></div>
          <div className="mt-5 flex gap-3">
            <Button variant="outline" onClick={() => clear.mutate()}>خالی کردن</Button>
            <Link href="/checkout" className="flex-1"><Button className="w-full">ادامه خرید</Button></Link>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
