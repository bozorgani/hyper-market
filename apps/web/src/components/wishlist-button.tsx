"use client";

import { Heart } from "lucide-react";
import { useToggleWishlist, useIsInWishlist } from "@/hooks/use-wishlist";
import { useAuthStore } from "@/store/auth-store";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

interface WishlistButtonProps {
  productId: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function WishlistButton({
  productId,
  size = "md",
  showLabel = false,
  className,
}: WishlistButtonProps) {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const { showToast } = useToast();

  const { data: isInWishlistData, isLoading: isChecking } = useIsInWishlist(
    productId,
    Boolean(user),
  );
  const toggleMutation = useToggleWishlist();

  const isInWishlist = isInWishlistData?.isInWishlist || false;
  const isLoading = isChecking || toggleMutation.isPending;

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      showToast({
        type: "info",
        title: "برای استفاده از علاقه‌مندی‌ها وارد شوید",
      });
      router.push("/login");
      return;
    }

    toggleMutation.mutate(productId);
  };

  if (showLabel) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        aria-pressed={isInWishlist}
        aria-busy={isLoading}
        className={cn(
          "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition",
          isInWishlist
            ? "bg-rose-50 text-rose-600 hover:bg-rose-100"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200",
          isLoading && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        <Heart
          className={cn(
            iconSizes[size],
            isInWishlist && "fill-current"
          )}
        />
        <span>{isInWishlist ? "در علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      aria-pressed={isInWishlist}
      aria-busy={isLoading}
      className={cn(
        "flex items-center justify-center rounded-full transition",
        sizeClasses[size],
        isInWishlist
          ? "bg-rose-50 text-rose-600 hover:bg-rose-100"
          : "bg-white text-slate-400 hover:bg-slate-50 hover:text-rose-600",
        isLoading && "opacity-50 cursor-not-allowed",
        "shadow-sm hover:shadow-md",
        className
      )}
      aria-label={isInWishlist ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
    >
      <Heart
        className={cn(
          iconSizes[size],
          isInWishlist && "fill-current"
        )}
      />
    </button>
  );
}
