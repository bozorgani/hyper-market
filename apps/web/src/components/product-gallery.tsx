"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

export function ProductGallery({ images, productName }: { images?: string[]; productName: string }) {
  const safeImages = useMemo(() => (images ?? []).filter(Boolean), [images]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedImage = safeImages[selectedIndex] ?? safeImages[0];

  if (!selectedImage) {
    return (
      <div className="flex h-full items-center justify-center rounded-3xl bg-slate-50 text-8xl">
        🛍️
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-3xl bg-slate-50">
        <Image
          src={selectedImage}
          alt={productName}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          unoptimized
          className="object-cover"
        />
      </div>
      {safeImages.length > 1 ? (
        <div className="grid grid-cols-5 gap-2">
          {safeImages.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              className={`relative aspect-square overflow-hidden rounded-2xl border bg-slate-50 transition ${index === selectedIndex ? "border-rose-500 ring-2 ring-rose-100" : "border-slate-200 hover:border-slate-300"}`}
              onClick={() => setSelectedIndex(index)}
              aria-label={`نمایش تصویر ${index + 1}`}
            >
              <Image
                src={image}
                alt={`${productName} - ${index + 1}`}
                fill
                sizes="20vw"
                unoptimized
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
