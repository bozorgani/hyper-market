"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { ReviewCard } from "./review-card";
import { ReviewForm } from "./review-form";
import { RatingDisplay } from "./star-rating";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { MessageSquare, Filter, SortDesc } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";

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

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
}

interface ProductReviewsProps {
  productId: string;
  orderId?: string; // For review form
}

export function ProductReviews({ productId, orderId }: ProductReviewsProps) {
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [ratingFilter, setRatingFilter] = useState<number | undefined>();
  const [sortBy, setSortBy] = useState<"createdAt" | "rating" | "helpfulCount">(
    "createdAt"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const limit = 10;

  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // Fetch reviews
  const {
    data: reviewsData,
    isLoading: isLoadingReviews,
    error: reviewsError,
  } = useQuery({
    queryKey: ["reviews", productId, ratingFilter, sortBy, sortOrder, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder,
      });

      if (ratingFilter) {
        params.append("rating", ratingFilter.toString());
      }

      const response = await api.get(
        `/reviews/product/${productId}?${params.toString()}`
      );
      return response.data;
    },
  });

  // Fetch stats
  const { data: stats } = useQuery<ReviewStats>({
    queryKey: ["review-stats", productId],
    queryFn: async () => {
      const response = await api.get(`/reviews/product/${productId}/stats`);
      return response.data;
    },
  });

  // Mark review as helpful
  const helpfulMutation = useMutation({
    mutationFn: async ({
      reviewId,
      isHelpful,
    }: {
      reviewId: string;
      isHelpful: boolean;
    }) => {
      await api.post(`/reviews/${reviewId}/helpful`, { isHelpful });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", productId] });
      showToast({
        type: "success",
        title: "رأی شما ثبت شد",
      });
    },
    onError: () => {
      showToast({
        type: "error",
        title: "ثبت رأی ناموفق بود",
      });
    },
  });

  const reviews: Review[] = reviewsData?.reviews || [];
  const pagination = reviewsData?.pagination;

  const handleReviewSuccess = () => {
    setShowReviewForm(false);
    queryClient.invalidateQueries({ queryKey: ["reviews", productId] });
    queryClient.invalidateQueries({ queryKey: ["review-stats", productId] });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-6 w-6 text-emerald-600" />
          <h2 className="text-2xl font-black text-slate-900">
            نظرات و امتیازات
          </h2>
        </div>
        {user && orderId && !showReviewForm && (
          <Button onClick={() => setShowReviewForm(true)}>
            نوشتن نظر
          </Button>
        )}
      </div>

      {/* Review Form */}
      {showReviewForm && orderId && (
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-bold text-slate-900">
            نظر خود را بنویسید
          </h3>
          <ReviewForm
            productId={productId}
            orderId={orderId}
            onSuccess={handleReviewSuccess}
            onCancel={() => setShowReviewForm(false)}
          />
        </Card>
      )}

      {/* Statistics */}
      {stats && stats.totalReviews > 0 && (
        <Card className="p-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Average Rating */}
            <div className="flex flex-col items-center justify-center border-l border-slate-200 pl-6">
              <p className="text-5xl font-black text-slate-900">
                {stats.averageRating.toFixed(1)}
              </p>
              <RatingDisplay
                rating={stats.averageRating}
                totalReviews={stats.totalReviews}
                size="lg"
                showCount={false}
                className="mt-2"
              />
              <p className="mt-2 text-sm text-slate-600">
                از {stats.totalReviews} نظر
              </p>
            </div>

            {/* Rating Distribution */}
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = stats.ratingDistribution[rating] || 0;
                const percentage =
                  stats.totalReviews > 0
                    ? (count / stats.totalReviews) * 100
                    : 0;

                return (
                  <button
                    key={rating}
                    onClick={() =>
                      setRatingFilter(ratingFilter === rating ? undefined : rating)
                    }
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 transition",
                      ratingFilter === rating
                        ? "bg-emerald-50"
                        : "hover:bg-slate-50"
                    )}
                  >
                    <span className="w-12 text-sm font-medium text-slate-700">
                      {rating} ستاره
                    </span>
                    <div className="flex-1">
                      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full bg-amber-400 transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-12 text-right text-sm text-slate-600">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Filters and Sort */}
      {stats && stats.totalReviews > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          {/* Rating Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">فیلتر:</span>
            <select
              value={ratingFilter || ""}
              onChange={(e) =>
                setRatingFilter(e.target.value ? Number(e.target.value) : undefined)
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-emerald-400"
            >
              <option value="">همه امتیازات</option>
              <option value="5">5 ستاره</option>
              <option value="4">4 ستاره</option>
              <option value="3">3 ستاره</option>
              <option value="2">2 ستاره</option>
              <option value="1">1 ستاره</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <SortDesc className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">مرتب‌سازی:</span>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [newSortBy, newSortOrder] = e.target.value.split("-");
                setSortBy(newSortBy as any);
                setSortOrder(newSortOrder as any);
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-emerald-400"
            >
              <option value="createdAt-desc">جدیدترین</option>
              <option value="createdAt-asc">قدیمی‌ترین</option>
              <option value="rating-desc">بیشترین امتیاز</option>
              <option value="rating-asc">کمترین امتیاز</option>
              <option value="helpfulCount-desc">مفیدترین</option>
            </select>
          </div>

          {/* Clear Filters */}
          {ratingFilter && (
            <button
              onClick={() => setRatingFilter(undefined)}
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
            >
              پاک کردن فیلتر
            </button>
          )}
        </div>
      )}

      {/* Reviews List */}
      {isLoadingReviews ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="p-6">
              <div className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="mt-4 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-3/4" />
            </Card>
          ))}
        </div>
      ) : reviewsError ? (
        <Card className="p-6">
          <p className="text-center text-red-600">
            خطا در بارگذاری نظرات. لطفاً دوباره تلاش کنید.
          </p>
        </Card>
      ) : reviews.length === 0 ? (
        <EmptyState
          title="هنوز نظری ثبت نشده"
          description={
            user && orderId
              ? "اولین نفری باشید که نظر می‌دهد!"
              : "برای ثبت نظر باید محصول را خریداری کرده باشید."
          }
          actions={
            user && orderId ? (
              <Button onClick={() => setShowReviewForm(true)}>
                نوشتن اولین نظر
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="space-y-4">
            {reviews.map((review) => (
              <ReviewCard
                key={review._id}
                review={review}
                onHelpful={(reviewId, isHelpful) =>
                  helpfulMutation.mutate({ reviewId, isHelpful })
                }
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                قبلی
              </Button>
              <span className="text-sm text-slate-600">
                صفحه {page} از {pagination.totalPages}
              </span>
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
    </div>
  );
}
