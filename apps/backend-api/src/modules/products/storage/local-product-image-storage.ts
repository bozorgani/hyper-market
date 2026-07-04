import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { IProductImageStorage, SavedImage, UploadableFile } from './product-image-storage.interface';
import { validateProductImageFile } from './product-image-validation';

const EXTENSIONS_BY_MIME_TYPE: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

/**
 * Local filesystem storage driver.
 *
 * Saves uploaded images to a directory on disk and serves them via the
 * Express static-file endpoint (`GET /api/v1/products/images/:fileName`).
 */
@Injectable()
export class LocalProductImageStorage implements IProductImageStorage {
  private readonly maxFileSizeBytes: number;
  private readonly uploadDir: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.maxFileSizeBytes = Number(
      this.configService.get<string>('PRODUCT_IMAGE_MAX_BYTES', '5242880'),
    );
    this.uploadDir = this.configService.get<string>(
      'PRODUCT_IMAGE_UPLOAD_DIR',
      join(process.cwd(), 'uploads', 'product-images'),
    );
    this.publicBaseUrl = this.configService
      .get<string>('PUBLIC_API_BASE_URL', '')
      .replace(/\/$/, '');
  }

  async saveProductImage(file: UploadableFile): Promise<SavedImage> {
    validateProductImageFile(file, this.maxFileSizeBytes);
    const buffer = file.buffer as Buffer;
    const mimeType = file.mimetype as string;

    await mkdir(this.uploadDir, { recursive: true });

    const extension = this.getSafeExtension(file.originalname, mimeType);
    const fileName = `${Date.now()}-${randomUUID()}${extension}`;
    const filePath = join(this.uploadDir, fileName);
    await writeFile(filePath, buffer);

    return {
      url: this.getImageUrl(fileName),
      fileName,
      size: file.size ?? buffer.length,
      mimeType,
    };
  }

  getImagePath(fileName: string): string {
    if (!/^[a-zA-Z0-9._-]+$/.test(fileName)) {
      throw new BadRequestException('Invalid image file name');
    }

    return join(this.uploadDir, fileName);
  }

  getImageUrl(fileName: string): string {
    const path = `/api/v1/products/images/${fileName}`;
    return this.publicBaseUrl ? `${this.publicBaseUrl}${path}` : path;
  }

  private getSafeExtension(originalName: string | undefined, mimeType: string): string {
    const originalExtension = extname(originalName ?? '').toLowerCase();
    const expectedExtension = EXTENSIONS_BY_MIME_TYPE[mimeType];

    if (originalExtension && ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(originalExtension)) {
      return originalExtension === '.jpeg' ? '.jpg' : originalExtension;
    }

    return expectedExtension ?? '.jpg';
  }
}
