"use client";

import { useState } from "react";
import { StarRating } from "./star-rating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { api } from "@/services/api";

interface ReviewFormProps {
  productId: string;
  orderId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ReviewForm({
  productId,
  orderId,
  onSuccess,
  onCancel,
}: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      showToast({
        type: "error",
        title: "لطفاً امتیاز را انتخاب کنید",
      });
      return;
    }

    if (comment.trim().length < 10) {
      showToast({
        type: "error",
        title: "نظر باید حداقل ۱۰ کاراکتر باشد",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post("/reviews", {
        productId,
        orderId,
        rating,
        title: title.trim() || undefined,
        comment: comment.trim(),
      });

      showToast({
        type: "success",
        title: "نظر شما با موفقیت ثبت شد",
        description: "پس از تأیید توسط مدیر، نمایش داده خواهد شد.",
      });

      // Reset form
      setRating(0);
      setTitle("");
      setComment("");

      onSuccess?.();
    } catch (error) {
      showToast({
        type: "error",
        title: "ثبت نظر ناموفق بود",
        description:
          error instanceof Error ? error.message : "لطفاً دوباره تلاش کنید",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Rating */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-900">
          امتیاز شما *
        </label>
        <StarRating
          rating={rating}
          size="lg"
          interactive
          onChange={setRating}
        />
        {rating > 0 && (
          <p className="mt-2 text-sm text-slate-600">
            {rating === 1 && "خیلی بد"}
            {rating === 2 && "بد"}
            {rating === 3 && "متوسط"}
            {rating === 4 && "خوب"}
            {rating === 5 && "عالی"}
          </p>
        )}
      </div>

      {/* Title */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-900">
          عنوان نظر (اختیاری)
        </label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="مثلاً: محصول عالی با کیفیت بالا"
          maxLength={100}
          disabled={isSubmitting}
        />
        <p className="mt-1 text-xs text-slate-500">
          {title.length}/100 کاراکتر
        </p>
      </div>

      {/* Comment */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-900">
          نظر شما *
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="تجربه خود را از این محصول بنویسید..."
          rows={5}
          maxLength={1000}
          disabled={isSubmitting}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-50"
        />
        <p className="mt-1 text-xs text-slate-500">
          {comment.length}/1000 کاراکتر (حداقل 10 کاراکتر)
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={isSubmitting || rating === 0 || comment.trim().length < 10}
          className="flex-1"
        >
          {isSubmitting ? "در حال ارسال..." : "ارسال نظر"}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            انصراف
          </Button>
        )}
      </div>
    </form>
  );
}
