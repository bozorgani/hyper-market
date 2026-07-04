import { Inject, Injectable } from '@nestjs/common';
import { IProductImageStorage, PRODUCT_IMAGE_STORAGE, SavedImage, UploadableFile } from '../storage/product-image-storage.interface';

/**
 * Facade that delegates to the active IProductImageStorage implementation.
 *
 * Existing code that injects `ProductImageStorageService` continues to work
 * without any changes. New code should inject `IProductImageStorage` via the
 * `PRODUCT_IMAGE_STORAGE` token for cleaner semantics.
 */
@Injectable()
export class ProductImageStorageService {
  constructor(
    @Inject(PRODUCT_IMAGE_STORAGE) private readonly storage: IProductImageStorage,
  ) {}

  async saveProductImage(file: UploadableFile): Promise<SavedImage> {
    return this.storage.saveProductImage(file);
  }

  getImagePath(fileName: string): string {
    if (!this.storage.getImagePath) {
      // S3 and other remote drivers don't have a local filesystem path.
      // The controller should use getImageUrl() instead for remote drivers.
      throw new Error(
        'getImagePath() is not available for the current storage driver. ' +
        'Use getImageUrl() instead, or switch to STORAGE_DRIVER=local.',
      );
    }
    return this.storage.getImagePath(fileName);
  }

  getImageUrl(fileName: string): string {
    return this.storage.getImageUrl(fileName);
  }

  /** Returns true when the active driver can serve images from local disk. */
  get supportsLocalFileServing(): boolean {
    return typeof this.storage.getImagePath === 'function';
  }
}
