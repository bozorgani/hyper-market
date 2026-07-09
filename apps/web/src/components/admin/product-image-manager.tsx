"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusMessage } from "@/components/ui/status-message";
import { useToast } from "@/components/ui/toast";
import { useUploadProductImage } from "@/features/admin/admin-api";

const MAX_IMAGES = 20;

function normalizeImageUrl(value: string) {
  return value.trim();
}

export function ProductImageManager({
  images,
  onChange,
  disabled,
}: {
  images: string[];
  onChange: (images: string[]) => void;
  disabled?: boolean;
}) {
  const uploadImage = useUploadProductImage();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [manualUrl, setManualUrl] = useState("");

  function addImageUrl(url: string) {
    const normalizedUrl = normalizeImageUrl(url);
    if (!normalizedUrl) return;

    if (images.includes(normalizedUrl)) {
      showToast({ type: "error", title: "این تصویر قبلاً اضافه شده است" });
      return;
    }

    if (images.length >= MAX_IMAGES) {
      showToast({ type: "error", title: "حداکثر ۲۰ تصویر برای هر محصول مجاز است" });
      return;
    }

    onChange([...images, normalizedUrl]);
    setManualUrl("");
  }

  async function handleFileChange(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;

    try {
      const result = await uploadImage.mutateAsync(file);
      addImageUrl(result.url);
      showToast({ type: "success", title: "تصویر محصول آپلود شد" });
    } catch (error) {
      showToast({ type: "error", title: "آپلود تصویر ناموفق بود", description: error instanceof Error ? error.message : undefined });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeImage(index: number) {
    onChange(images.filter((_, itemIndex) => itemIndex !== index));
  }

  function makePrimary(index: number) {
    const nextImages = [...images];
    const [selected] = nextImages.splice(index, 1);
    onChange([selected, ...nextImages]);
  }

  return (
    <div className="space-y-3 md:col-span-2">
      <div>
        <p className="text-sm font-semibold text-slate-600">تصاویر محصول</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          تصویر اول به‌عنوان تصویر اصلی در کارت محصول، سبد خرید و صفحه جزئیات نمایش داده می‌شود.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
        <Input value={manualUrl} onChange={(event) => setManualUrl(event.target.value)} placeholder="آدرس تصویر یا CDN/MinIO" disabled={disabled || uploadImage.isPending} />
        <Button type="button" variant="outline" disabled={disabled || uploadImage.isPending || !manualUrl.trim()} onClick={() => addImageUrl(manualUrl)}>
          افزودن آدرس
        </Button>
        <Button type="button" disabled={disabled || uploadImage.isPending || images.length >= MAX_IMAGES} onClick={() => fileInputRef.current?.click()}>
          <ImagePlus className="h-4 w-4" />
          {uploadImage.isPending ? "در حال آپلود..." : "آپلود تصویر"}
        </Button>
        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(event) => handleFileChange(event.target.files)} />
      </div>

      <StatusMessage variant="warning">
        ذخیره فعلی فایل روی backend local انجام می‌شود و خروجی آن داخل فیلد images ذخیره می‌شود؛ مسیر بعدی می‌تواند جایگزینی همین سرویس با MinIO باشد.
      </StatusMessage>

      {images.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {images.map((image, index) => (
            <div key={`${image}-${index}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="relative aspect-square bg-slate-100">
                <Image src={image} alt={`تصویر ${index + 1}`} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover" unoptimized={image.startsWith('http') && !image.includes('localhost') && !image.includes('hypermarket') && !image.includes('placehold.co')} />
              </div>
              <div className="space-y-2 p-3">
                <p className="truncate text-xs text-slate-500">{image}</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant={index === 0 ? "default" : "outline"} className="h-9 px-3 text-xs" disabled={disabled || index === 0} onClick={() => makePrimary(index)}>
                    {index === 0 ? "تصویر اصلی" : "اصلی شود"}
                  </Button>
                  <Button type="button" variant="destructive" className="h-9 px-3 text-xs" disabled={disabled} onClick={() => removeImage(index)}>
                    <Trash2 className="h-3.5 w-3.5" />
                    حذف
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
          هنوز تصویری برای محصول اضافه نشده است.
        </div>
      )}
    </div>
  );
}
