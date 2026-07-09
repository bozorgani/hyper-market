"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useCart, useClearCart, useRemoveFromCart, useUpdateCartQuantity } from "@/hooks/use-cart";
import { formatNumber, formatPrice } from "@/lib/utils";
import { getProductImageUrl } from "@/lib/image-utils";
import { useAuthStore } from "@/store/auth-store";

function isCustomerRole(role?: string) {
  return role === "customer" || role === "CUSTOMER";
}

export function CartPageClient() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const isCustomer = isCustomerRole(user?.role);
  const cart = useCart(Boolean(hydrated && isCustomer));
  const remove = useRemoveFromCart();
  const updateQuantity = useUpdateCartQuantity();
  const clear = useClearCart();
  const { showToast } = useToast();
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [mutatingProductId, setMutatingProductId] = useState<string | null>(null);
  const detailedItems = cart.data?.items ?? [];
  const totalPrice = cart.data?.totalPrice ?? 0;
  const hasItems = detailedItems.length > 0;
  const isMutating = remove.isPending || updateQuantity.isPending || clear.isPending;
  const cartErrorMessage = useMemo(() => {
    if (!cart.error) return "";
    return cart.error instanceof Error ? cart.error.message : "دریافت سبد خرید ناموفق بود.";
  }, [cart.error]);

  useEffect(() => {
    if (hydrated && user && !isCustomer) {
      router.replace("/admin");
    }
  }, [hydrated, isCustomer, router, user]);

  async function decrementItem(productId: string, quantity: number) {
    if (isMutating) return;
    setMutatingProductId(productId);
    try {
      if (quantity <= 1) {
        await remove.mutateAsync(productId);
        showToast({ type: "success", title: "محصول از سبد حذف شد" });
        return;
      }

      await updateQuantity.mutateAsync({ productId, quantity: quantity - 1 });
    } catch (error) {
      showToast({ type: "error", title: "خطا در به‌روزرسانی سبد", description: error instanceof Error ? error.message : undefined });
    } finally {
      setMutatingProductId(null);
    }
  }

  async function incrementItem(productId: string, quantity: number) {
    if (isMutating) return;
    setMutatingProductId(productId);
    try {
      await updateQuantity.mutateAsync({ productId, quantity: quantity + 1 });
    } catch (error) {
      showToast({ type: "error", title: "خطا در افزایش تعداد", description: error instanceof Error ? error.message : undefined });
    } finally {
      setMutatingProductId(null);
    }
  }

  async function removeItem(productId: string) {
    if (isMutating) return;
    setMutatingProductId(productId);
    try {
      await remove.mutateAsync(productId);
      showToast({ type: "success", title: "محصول از سبد حذف شد" });
    } catch (error) {
      showToast({ type: "error", title: "حذف محصول ناموفق بود", description: error instanceof Error ? error.message : undefined });
    } finally {
      setMutatingProductId(null);
    }
  }

  async function clearCart() {
    if (isMutating) return;
    try {
      await clear.mutateAsync();
      setClearDialogOpen(false);
      showToast({ type: "success", title: "سبد خرید خالی شد" });
    } catch (error) {
      showToast({ type: "error", title: "خالی کردن سبد ناموفق بود", description: error instanceof Error ? error.message : undefined });
    }
  }

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-4xl px-4 py-8 text-right">
        <PageHeader
          title="سبد خرید من"
          description="در این بخش می‌توانید تعداد کالاها را تغییر دهید، سبد را خالی کنید یا برای پرداخت ادامه دهید."
          badge={
            !cart.isLoading && !cart.isError && hasItems ? (
              <div className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm">
                {formatNumber(detailedItems.length)} آیتم در سبد
              </div>
            ) : undefined
          }
        />

        {cart.isLoading ? (
          <Card className="mt-5 divide-y divide-slate-100 overflow-hidden">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="p-4">
                <Skeleton className="h-20 w-full" />
              </div>
            ))}
          </Card>
        ) : null}

        {!cart.isLoading && cartErrorMessage ? (
          <div className="mt-5">
            <ErrorState
              title="بارگذاری سبد خرید انجام نشد"
              description={cartErrorMessage}
              actions={
                <>
                  <Button type="button" variant="outline" onClick={() => cart.refetch()}>
                    تلاش مجدد
                  </Button>
                  <Link href="/products">
                    <Button type="button">مشاهده محصولات</Button>
                  </Link>
                </>
              }
            />
          </div>
        ) : null}

        {!cart.isLoading && !cartErrorMessage && !hasItems ? (
          <div className="mt-5">
            <EmptyState
              title="سبد خرید شما خالی است"
              description="برای ثبت سفارش، ابتدا چند محصول به سبد اضافه کنید و سپس دوباره به این صفحه برگردید."
              actions={
                <Link href="/products">
                  <Button type="button">شروع خرید</Button>
                </Link>
              }
            />
          </div>
        ) : null}

        {!cart.isLoading && !cartErrorMessage && hasItems ? (
          <>
            <Card className="mt-5 divide-y divide-slate-100 overflow-hidden">
              {detailedItems.map((item) => {
                const isItemMutating = mutatingProductId === item.productId;
                return (
                <div key={item.productId} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 text-2xl">
                      {item.image ? (
                        <Image src={getProductImageUrl(item.image)} alt={item.name} fill sizes="64px" className="object-cover" />
                      ) : (
                        "🛒"
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold">{item.product?.name ?? item.name}</p>
                        {item.isAvailable === false ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            نیازمند بررسی
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm text-slate-500">موجودی: {formatNumber(item.stock)}</p>
                      <p className="text-sm font-bold text-rose-600">{formatPrice(item.lineTotal)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <div className="flex items-center rounded-2xl border border-slate-200 bg-white">
                      <Button variant="ghost" className="h-10 w-10 rounded-2xl px-0" disabled={isMutating} onClick={() => decrementItem(item.productId, item.quantity)} aria-label="کاهش تعداد">
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="min-w-10 text-center text-sm font-black">{isItemMutating ? "..." : formatNumber(item.quantity)}</span>
                      <Button variant="ghost" className="h-10 w-10 rounded-2xl px-0" disabled={isMutating || item.isAvailable === false || item.quantity >= item.stock} onClick={() => incrementItem(item.productId, item.quantity)} aria-label="افزایش تعداد">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button type="button" variant="outline" disabled={isMutating} onClick={() => removeItem(item.productId)}>
                      {isItemMutating && remove.isPending ? "در حال حذف..." : "حذف"}
                    </Button>
                  </div>
                </div>
                );
              })}
            </Card>

            <div className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between text-lg font-black">
                <span>مجموع</span>
                <span>{formatPrice(totalPrice)}</span>
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Button type="button" variant="outline" onClick={() => setClearDialogOpen(true)} disabled={isMutating}>
                  خالی کردن سبد
                </Button>
                <Link href="/checkout" className="flex-1">
                  <Button type="button" className="w-full" disabled={isMutating}>ادامه خرید</Button>
                </Link>
              </div>
            </div>
          </>
        ) : null}

        <ConfirmDialog
          open={clearDialogOpen}
          title="خالی کردن سبد خرید"
          description="همه آیتم‌های سبد خرید حذف می‌شوند. مطمئن هستید که می‌خواهید ادامه دهید؟"
          confirmText="بله، خالی شود"
          cancelText="بازگشت"
          destructive
          loading={clear.isPending}
          onCancel={() => setClearDialogOpen(false)}
          onConfirm={clearCart}
        />
      </div>
    </ProtectedRoute>
  );
}
