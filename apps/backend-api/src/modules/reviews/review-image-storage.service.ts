import { Injectable } from '@nestjs/common';
import { ProductImageStorageService } from '../products/services/product-image-storage.service';
import type { SavedImage, UploadableFile } from '../products/storage/product-image-storage.interface';

/**
 * Review-specific facade over the configured image storage driver.
 *
 * The storage implementation is shared with product images so local and
 * S3-compatible deployments use the same validation, persistence, and public
 * URL behavior. Keeping this facade in the review module prevents controllers
 * from depending directly on product-image implementation details.
 */
@Injectable()
export class ReviewImageStorageService {
  constructor(
    private readonly productImageStorageService: ProductImageStorageService,
  ) {}

  saveReviewImage(file: UploadableFile): Promise<SavedImage> {
    return this.productImageStorageService.saveProductImage(file);
  }
}
