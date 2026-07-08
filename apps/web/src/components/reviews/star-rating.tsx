"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (rating: number) => void;
  className?: string;
}

export function StarRating({
  rating,
  maxRating = 5,
  size = "md",
  interactive = false,
  onChange,
  className,
}: StarRatingProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const handleClick = (value: number) => {
    if (interactive && onChange) {
      onChange(value);
    }
  };

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {Array.from({ length: maxRating }, (_, index) => {
        const value = index + 1;
        const isFilled = value <= rating;
        const isHalf = !isFilled && value - 0.5 <= rating;

        return (
          <button
            key={value}
            type="button"
            onClick={() => handleClick(value)}
            disabled={!interactive}
            className={cn(
              "transition-colors",
              interactive && "cursor-pointer hover:scale-110",
              !interactive && "cursor-default"
            )}
          >
            <Star
              className={cn(
                sizeClasses[size],
                isFilled && "fill-amber-400 text-amber-400",
                isHalf && "fill-amber-400/50 text-amber-400",
                !isFilled && !isHalf && "fill-slate-200 text-slate-200"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

interface RatingDisplayProps {
  rating: number;
  totalReviews: number;
  size?: "sm" | "md" | "lg";
  showCount?: boolean;
  className?: string;
}

export function RatingDisplay({
  rating,
  totalReviews,
  size = "md",
  showCount = true,
  className,
}: RatingDisplayProps) {
  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <StarRating rating={rating} size={size} />
      <span className={cn("font-semibold text-slate-900", textSizes[size])}>
        {rating.toFixed(1)}
      </span>
      {showCount && (
        <span className={cn("text-slate-500", textSizes[size])}>
          ({totalReviews} نظر)
        </span>
      )}
    </div>
  );
}
