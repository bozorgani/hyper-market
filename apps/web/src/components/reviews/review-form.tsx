"use client";

import Image from "next/image";
import { useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { StarRating } from "./star-rating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { api } from "@/services/api";
import { isKnownOptimizedImageSource } from "@/lib/image-utils";

interface ReviewFormProps {
  productId: string;
  orderId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

type ReviewImageUploadResponse = {
  url: string;
  fileName: string;
  size: number;
  mimeType: string;
};

const MAX_REVIEW_IMAGES = 5;
const MAX_REVIEW_IMAGE_BYTES = 5 * 1024 * 1024;
const REVIEW_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const REVIEW_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function ReviewForm({
  productId,
  orderId,
  onSuccess,
  onCancel,
}: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleImageSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (selectedFiles.length === 0) return;

    const availableSlots = MAX_REVIEW_IMAGES - images.length;
    if (availableSlots <= 0) {
      showToast({
        type: "info",
        title: `حداکثر ${MAX_REVIEW_IMAGES} تصویر قابل ارسال است`,
      });
      return;
    }

    const filesToUpload = selectedFiles.slice(0, availableSlots);
    if (selectedFiles.length > availableSlots) {
      showToast({
        type: "info",
        title: `فقط ${availableSlots} تصویر دیگر قابل انتخاب است`,
      });
    }

    const invalidFile = filesToUpload.find(
      (file) =>
        !REVIEW_IMAGE_MIME_TYPES.has(file.type) ||
        file.size > MAX_REVIEW_IMAGE_BYTES,
    );
    if (invalidFile) {
      showToast({
        type: "error",
        title: "فرمت یا حجم تصویر معتبر نیست",
        description: "فقط تصاویر JPG، PNG، WebP و GIF تا حجم ۵ مگابایت مجاز هستند.",
      });
      return;
    }

    setIsUploadingImages(true);
    try {
      for (const file of filesToUpload) {
        const formData = new FormData();
        formData.append("image", file);
        const response = await api.post<ReviewImageUploadResponse>(
          "/reviews/images/upload",
          formData,
        );
        setImages((currentImages) => [
          ...currentImages,
          response.data.url,
        ].slice(0, MAX_REVIEW_IMAGES));
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "آپلود تصویر ناموفق بود",
        description: error instanceof Error ? error.message : "لطفاً دوباره تلاش کنید",
      });
    } finally {
      setIsUploadingImages(false);
    }
  };

  const removeImage = (index: number) => {
    setImages((currentImages) => currentImages.filter((_, imageIndex) => imageIndex !== index));
  };

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
        images: images.length > 0 ? images : undefined,
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
      setImages([]);

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
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100 disabled:bg-slate-50"
        />
        <p className="mt-1 text-xs text-slate-500">
          {comment.length}/1000 کاراکتر (حداقل 10 کاراکتر)
        </p>
      </div>

      {/* Images */}
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label htmlFor="review-images" className="block text-sm font-semibold text-slate-900">
            تصاویر تجربه شما (اختیاری)
          </label>
          <span className="text-xs text-slate-500">
            {images.length}/{MAX_REVIEW_IMAGES}
          </span>
        </div>
        <label
          htmlFor="review-images"
          className="flex min-h-24 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600 transition hover:border-rose-400 hover:bg-rose-50 disabled:cursor-not-allowed"
        >
          {isUploadingImages ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-rose-600" aria-hidden="true" />
              در حال آپلود تصویر...
            </>
          ) : (
            <>
              <ImagePlus className="h-5 w-5 text-rose-600" aria-hidden="true" />
              انتخاب تصویر
            </>
          )}
        </label>
        <input
          id="review-images"
          type="file"
          accept={REVIEW_IMAGE_ACCEPT}
          multiple
          disabled={isSubmitting || isUploadingImages || images.length >= MAX_REVIEW_IMAGES}
          onChange={handleImageSelection}
          className="sr-only"
        />
        <p className="mt-1 text-xs leading-5 text-slate-500">
          حداکثر ۵ تصویر JPG، PNG، WebP یا GIF تا حجم ۵ مگابایت برای هر تصویر.
        </p>
        {images.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-3" aria-label="تصاویر انتخاب‌شده">
            {images.map((image, index) => (
              <div
                key={`${image}-${index}`}
                className="relative h-20 w-20 overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
              >
                <Image
                  src={image}
                  alt={`پیش‌نمایش تصویر ${index + 1}`}
                  fill
                  sizes="80px"
                  className="object-cover"
                  unoptimized={!isKnownOptimizedImageSource(image)}
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  disabled={isSubmitting || isUploadingImages}
                  aria-label={`حذف تصویر ${index + 1}`}
                  className="absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-950/70 text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={isSubmitting || isUploadingImages || rating === 0 || comment.trim().length < 10}
          className="flex-1"
        >
          {isSubmitting ? "در حال ارسال..." : "ارسال نظر"}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting || isUploadingImages}
          >
            انصراف
          </Button>
        )}
      </div>
    </form>
  );
}
