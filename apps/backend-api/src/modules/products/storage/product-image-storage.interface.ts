/**
 * Abstraction for product image storage.
 *
 * Two drivers are supported:
 *   • local — saves files to the server's filesystem (default, backward compatible)
 *   • s3    — uploads to an S3-compatible bucket (requires @aws-sdk/client-s3)
 *
 * The active driver is selected via the STORAGE_DRIVER env var.
 */

export type SavedImage = {
  /** Public URL where the image can be accessed */
  url: string;
  /** Stored file name (unique, generated) */
  fileName: string;
  /** File size in bytes */
  size: number;
  /** MIME type of the uploaded image */
  mimeType: string;
};

export type UploadableFile = {
  originalname?: string;
  mimetype?: string;
  size?: number;
  buffer?: Buffer;
};

export interface IProductImageStorage {
  /**
   * Persist an uploaded image and return its public metadata.
   */
  saveProductImage(file: UploadableFile): Promise<SavedImage>;

  /**
   * Return the absolute filesystem path for a locally-stored image.
   * Only available when the storage driver is "local".
   * Returns `undefined` for drivers that don't serve files from disk (e.g. s3).
   */
  getImagePath?(fileName: string): string;

  /**
   * Resolve the public URL for an already-stored image by its fileName.
   * For "local" this reconstructs the URL; for "s3" this builds the object URL.
   */
  getImageUrl(fileName: string): string;
}

/**
 * NestJS injection token for the active IProductImageStorage implementation.
 */
export const PRODUCT_IMAGE_STORAGE = 'PRODUCT_IMAGE_STORAGE';
