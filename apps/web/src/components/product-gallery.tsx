"use client";

import Image from "next/image";
import { useState } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function ProductGallery({ images, productName }: { images?: string[]; productName: string }) {
  const safeImages = (images ?? []).filter(Boolean);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const selectedImage = safeImages[selectedIndex] ?? safeImages[0];

  if (!selectedImage) {
    return (
      <div className="flex h-full items-center justify-center rounded-3xl bg-slate-100 text-8xl border border-slate-200">
        🛍️
      </div>
    );
  }

  const goTo = (idx: number) => {
    setSelectedIndex((idx + safeImages.length) % safeImages.length);
  };

  const openLightbox = () => setIsLightboxOpen(true);
  const closeLightbox = () => setIsLightboxOpen(false);

  return (
    <div className="space-y-3">
      {/* Main Image */}
      <div 
        className="group relative aspect-square overflow-hidden rounded-3xl bg-slate-100 border border-slate-100 cursor-zoom-in"
        onClick={openLightbox}
      >
        <Image
          src={selectedImage}
          alt={productName}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover transition-all duration-500 group-hover:scale-[1.035]"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/5 opacity-0 group-hover:opacity-100 transition" />
        
        <button
          onClick={(e) => { e.stopPropagation(); openLightbox(); }}
          className="absolute bottom-4 left-4 flex items-center gap-1.5 rounded-2xl bg-white/90 px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur transition hover:bg-white"
        >
          <ZoomIn className="h-3.5 w-3.5" /> بزرگنمایی
        </button>

        {safeImages.length > 1 && (
          <>
            <button 
              onClick={(e) => { e.stopPropagation(); goTo(selectedIndex - 1); }}
              className="absolute top-1/2 -translate-y-1/2 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow hover:bg-white"
              aria-label="تصویر قبلی"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); goTo(selectedIndex + 1); }}
              className="absolute top-1/2 -translate-y-1/2 left-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow hover:bg-white"
              aria-label="تصویر بعدی"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {safeImages.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {safeImages.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={`relative aspect-square overflow-hidden rounded-2xl border bg-slate-100 transition-all duration-150 ${
                index === selectedIndex 
                  ? "border-emerald-500 ring-2 ring-emerald-200 scale-[1.015]" 
                  : "border-slate-200 hover:border-slate-300"
              }`}
              aria-label={`نمایش تصویر ${index + 1} از ${safeImages.length}`}
            >
              <Image
                src={image}
                alt={`${productName} - ${index + 1}`}
                fill
                sizes="20vw"
                className="object-cover"
                unoptimized
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      <AnimatePresence>
        {isLightboxOpen && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4"
            onClick={closeLightbox}
            role="dialog"
            aria-modal="true"
            aria-label="گالری تصاویر محصول"
          >
            <button 
              onClick={closeLightbox} 
              className="absolute top-4 right-4 z-10 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
              aria-label="بستن گالری"
            >
              <X className="h-6 w-6" />
            </button>

            <div className="relative max-h-[90vh] max-w-5xl w-full" onClick={e => e.stopPropagation()}>
              <div className="relative aspect-[4/3] md:aspect-[16/9] overflow-hidden rounded-3xl bg-black">
                <Image 
                  src={selectedImage} 
                  alt={productName} 
                  fill 
                  className="object-contain" 
                  unoptimized 
                />
              </div>

              {safeImages.length > 1 && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  {safeImages.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedIndex(idx)}
                      className={`h-1.5 rounded-full transition-all ${idx === selectedIndex ? 'bg-white w-6' : 'bg-white/40 w-2 hover:bg-white/70'}`}
                      aria-label={`رفتن به تصویر ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
