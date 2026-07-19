"use client";

import { StarRating } from "./star-rating";
import { ThumbsUp, ThumbsDown, CheckCircle, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { faIR } from "date-fns/locale";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { isKnownOptimizedImageSource } from "@/lib/image-utils";

interface Review {
  _id: string;
  rating: number;
  title?: string;
  comment: string;
  userId: {
    name: string;
    email: string;
  };
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  notHelpfulCount: number;
  images?: string[];
  createdAt: string;
}

interface ReviewCardProps {
  review: Review;
  onHelpful?: (reviewId: string, isHelpful: boolean) => void;
  className?: string;
}

export function ReviewCard({ review, onHelpful, className }: ReviewCardProps) {
  const timeAgo = formatDistanceToNow(new Date(review.createdAt), {
    addSuffix: true,
    locale: faIR,
  });

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-md",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* User Avatar */}
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100">
            <User className="h-5 w-5 text-rose-600" />
          </div>

          {/* User Info */}
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-slate-900">
                {review.userId.name}
              </p>
              {review.isVerifiedPurchase && (
                <div className="flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                  <CheckCircle className="h-3 w-3" />
                  <span>خرید تأیید شده</span>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500">{timeAgo}</p>
          </div>
        </div>

        {/* Rating */}
        <StarRating rating={review.rating} size="sm" />
      </div>

      {/* Content */}
      <div className="mt-4">
        {review.title && (
          <h4 className="mb-2 font-bold text-slate-900">{review.title}</h4>
        )}
        <p className="leading-relaxed text-slate-700">{review.comment}</p>
      </div>

      {/* Images */}
      {review.images && review.images.length > 0 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          {review.images.map((image, index) => (
            <div
              key={index}
              className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200"
            >
              <Image
                src={image}
                alt={`تصویر نظر ${index + 1}`}
                fill
                className="object-cover"
                sizes="80px"
                unoptimized={!isKnownOptimizedImageSource(image)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Helpful Actions */}
      <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-4">
        <span className="text-sm text-slate-600">آیا این نظر مفید بود؟</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onHelpful?.(review._id, true)}
            disabled={!onHelpful}
            title={!onHelpful ? "برای ثبت رأی ابتدا وارد شوید" : undefined}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ThumbsUp className="h-4 w-4" />
            <span>مفید ({review.helpfulCount})</span>
          </button>
          <button
            type="button"
            onClick={() => onHelpful?.(review._id, false)}
            disabled={!onHelpful}
            title={!onHelpful ? "برای ثبت رأی ابتدا وارد شوید" : undefined}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ThumbsDown className="h-4 w-4" />
            <span>({review.notHelpfulCount})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
