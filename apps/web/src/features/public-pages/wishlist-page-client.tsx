"use client";

import { useState } from "react";
import { useWishlist, useClearWishlist, type WishlistProduct } from "@/hooks/use-wishlist";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { Heart, Trash2, ShoppingBag } from "lucide-react";
import { LinkButton } from "@/components/ui/link-button";
import { useAddToCart } from "@/hooks/use-cart";
import { useToast } from "@/components/ui/toast";
import { useAuthStore } from "@/store/auth-store";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function WishlistPageClient() {
  const [page, setPage] = useState(1);
  const limit = 12;
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const { showToast } = useToast();
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);

  const { data, isLoading } = useWishlist(page, limit, Boolean(hydrated && user));
  const clearMutation = useClearWishlist();
  const addToCartMutation = useAddToCart();

  const products = data?.products || [];
  const pagination = data?.pagination;

  const handleAddToCart = async (productId: string) => {
    try {
      await addToCartMutation.mutateAsync({ productId, quantity: 1 });
      showToast({
        type: "success",
        title: "به سبد خرید اضافه شد",
      });
    } catch {
      // Error is handled by the mutation
    }
  };

  const handleClearWishlist = async () => {
    try {
      await clearMutation.mutateAsync();
      setClearDialogOpen(false);
    } catch {
      // Error is handled by the mutation
    }
  };

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Heart className="h-8 w-8 text-rose-600" />
            <div>
              <h1 className="text-3xl font-black text-slate-900">
                علاقه‌مندی‌های من
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                {pagination?.total || 0} محصول در علاقه‌مندی‌ها
              </p>
            </div>
          </div>

          {products.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setClearDialogOpen(true)}
              disabled={clearMutation.isPending}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              <span>پاک کردن همه</span>
            </Button>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Card key={index} className="p-4">
                <Skeleton className="aspect-square w-full rounded-lg" />
                <Skeleton className="mt-4 h-4 w-3/4" />
                <Skeleton className="mt-2 h-4 w-1/2" />
                <Skeleton className="mt-4 h-10 w-full" />
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && products.length === 0 && (
          <EmptyState
            icon={Heart}
            title="علاقه‌مندی‌های شما خالی است"
            description="محصولات مورد علاقه خود را با کلیک روی آیکون قلب به این لیست اضافه کنید."
            actions={
              <LinkButton href="/products">
                <ShoppingBag className="ml-2 h-4 w-4" />
                مشاهده محصولات
              </LinkButton>
            }
          />
        )}

        {/* Products Grid */}
        {!isLoading && products.length > 0 && (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product: WishlistProduct, index: number) => (
                <div key={product._id} className="relative">
                  <ProductCard product={product} priority={page === 1 && index < 4} />

                  {/* Add to Cart Button */}
                  {product.stock > 0 && product.isActive && (
                    <div className="absolute bottom-3 left-3 right-3 z-10">
                      <Button
                        onClick={() => handleAddToCart(product._id)}
                        disabled={addToCartMutation.isPending}
                        className="w-full"
                        size="sm"
                      >
                        <ShoppingBag className="ml-2 h-4 w-4" />
                        افزودن به سبد خرید
                      </Button>
                    </div>
                  )}

                  {/* Inactive Product Badge (out-of-stock overlay is handled by ProductCard) */}
                  {product.stock > 0 && !product.isActive && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
                      <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-900">
                        غیرفعال
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  قبلی
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
                    (pageNum) => (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        onClick={() => setPage(pageNum)}
                        className="h-10 w-10 p-0"
                      >
                        {pageNum}
                      </Button>
                    )
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === pagination.totalPages}
                >
                  بعدی
                </Button>
              </div>
            )}
          </>
        )}

        <ConfirmDialog
          open={clearDialogOpen}
          title="پاک کردن علاقه‌مندی‌ها"
          description="همه آیتم‌های لیست علاقه‌مندی‌ها حذف می‌شوند. مطمئن هستید که می‌خواهید ادامه دهید؟"
          confirmText="بله، پاک شود"
          cancelText="بازگشت"
          destructive
          loading={clearMutation.isPending}
          onCancel={() => setClearDialogOpen(false)}
          onConfirm={handleClearWishlist}
        />
      </div>
    </ProtectedRoute>
  );
}
