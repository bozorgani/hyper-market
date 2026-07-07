/**
 * Converts a product image filename to a full URL
 * 
 * @param fileName - The image filename (e.g., "product-123.jpg")
 * @returns Full URL to the image (e.g., "http://localhost:3001/api/v1/products/images/product-123.jpg")
 */
export function getProductImageUrl(fileName: string): string {
  // If it's already a full URL, return as-is
  if (fileName.startsWith('http://') || fileName.startsWith('https://')) {
    return fileName;
  }
  
  // Build the full URL
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api/v1';
  return `${apiBaseUrl}/products/images/${fileName}`;
}

/**
 * Converts an array of product image filenames to full URLs
 * 
 * @param fileNames - Array of image filenames
 * @returns Array of full URLs
 */
export function getProductImageUrls(fileNames: string[]): string[] {
  return fileNames.map(getProductImageUrl);
}
