import Image from "next/image";
import { getProductImageUrl, isKnownOptimizedImageSource } from "@/lib/image-utils";
import { cn } from "@/lib/utils";

export function CategoryVisual({
  name,
  icon,
  image,
  className,
}: {
  name: string;
  icon?: string | null;
  image?: string | null;
  className?: string;
}) {
  const imageUrl = image ? getProductImageUrl(image) : null;

  return (
    <div className={cn("relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-rose-50 to-orange-50 text-3xl", className)}>
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={name}
          fill
          sizes="64px"
          unoptimized={!isKnownOptimizedImageSource(imageUrl)}
          className="object-contain p-2"
        />
      ) : (
        <span aria-hidden="true">{icon || "📦"}</span>
      )}
    </div>
  );
}
