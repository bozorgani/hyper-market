/**
 * Converts a product image filename to a full URL.
 *
 * @param fileName - The image filename (e.g., "product-123.jpg")
 * @returns Full URL to the image
 */
export function getProductImageUrl(fileName: string): string {
  if (fileName.startsWith("http://") || fileName.startsWith("https://")) {
    return fileName;
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api/v1";
  return `${apiBaseUrl}/products/images/${encodeURIComponent(fileName)}`;
}

/**
 * Returns whether an image source is covered by the configured Next Image
 * remote patterns. Unknown admin/CDN URLs remain explicitly unoptimized
 * instead of disabling optimization for the whole application.
 */
export function isKnownOptimizedImageSource(value: string): boolean {
  if (value.startsWith("/")) return true;

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;

    const configuredApi = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (configuredApi && new URL(configuredApi).origin === url.origin) return true;

    return (
      url.hostname === "localhost" ||
      url.hostname === "hypermarket.ir" ||
      url.hostname.endsWith(".hypermarket.ir") ||
      // placehold.co currently returns SVG placeholders and is not reliably
      // reachable from a self-hosted Docker server. Keep it unoptimized so
      // Next's server-side image fetcher does not fail or reject SVG content.
      url.hostname === "up.railway.app" ||
      url.hostname.endsWith(".up.railway.app")
    );
  } catch {
    return false;
  }
}
