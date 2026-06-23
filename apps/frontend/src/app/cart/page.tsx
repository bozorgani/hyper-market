"use client";

import Link from "next/link";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatNumber, formatPrice } from "@/lib/utils";
import { useCart, useClearCart, useRemoveFromCart } from "@/hooks/use-cart";

export default function CartPage() {
  const cart = useCart();
  const remove = useRemoveFromCart();
  const clear = useClearCart();

  return (
    <ProtectedRoute>
      <main className="mx-auto max-w-4xl px-4 py-8 text-right">
        <h1 className="text-2xl font-black">سبد خرید من</h1>
        <Card className="mt-5 divide-y divide-slate-100 overflow-hidden">
          {(cart.data?.cart.items ?? []).length === 0 ? <p className="p-6 text-slate-500">سبد خرید شما خالی است.</p> : null}
          {(cart.data?.cart.items ?? []).map((item) => (
            <div key={item.productId} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="truncate font-semibold">محصول {item.productId}</p>
                <p className="text-sm text-slate-500">تعداد: {formatNumber(item.quantity)}</p>
              </div>
              <Button variant="outline" onClick={() => remove.mutate(item.productId)}>حذف</Button>
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
