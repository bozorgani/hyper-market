import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const EXTENSIONS_BY_MIME_TYPE: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

@Injectable()
export class ProductImageStorageService {
  private readonly maxFileSizeBytes: number;
  private readonly uploadDir: string;

  constructor(private readonly configService: ConfigService) {
    this.maxFileSizeBytes = Number(
      this.configService.get<string>('PRODUCT_IMAGE_MAX_BYTES', '5242880'),
    );
    this.uploadDir = this.configService.get<string>(
      'PRODUCT_IMAGE_UPLOAD_DIR',
      join(process.cwd(), 'uploads', 'product-images'),
    );
  }

  async saveProductImage(file: {
    originalname?: string;
    mimetype?: string;
    size?: number;
    buffer?: Buffer;
  }): Promise<{ url: string; fileName: string; size: number; mimeType: string }> {
    if (!file?.buffer || !file.mimetype) {
      throw new BadRequestException('Image file is required');
    }

    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Only jpg, png, webp and gif images are allowed');
    }

    if ((file.size ?? file.buffer.length) > this.maxFileSizeBytes) {
      throw new BadRequestException('Image file is too large');
    }

    await mkdir(this.uploadDir, { recursive: true });

    const extension = this.getSafeExtension(file.originalname, file.mimetype);
    const fileName = `${Date.now()}-${randomUUID()}${extension}`;
    const filePath = join(this.uploadDir, fileName);
    await writeFile(filePath, file.buffer);

    return {
      url: this.buildPublicUrl(fileName),
      fileName,
      size: file.size ?? file.buffer.length,
      mimeType: file.mimetype,
    };
  }

  getImagePath(fileName: string): string {
    if (!/^[a-zA-Z0-9._-]+$/.test(fileName)) {
      throw new BadRequestException('Invalid image file name');
    }

    return join(this.uploadDir, fileName);
  }

  private getSafeExtension(originalName: string | undefined, mimeType: string): string {
    const originalExtension = extname(originalName ?? '').toLowerCase();
    const expectedExtension = EXTENSIONS_BY_MIME_TYPE[mimeType];

    if (originalExtension && ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(originalExtension)) {
      return originalExtension === '.jpeg' ? '.jpg' : originalExtension;
    }

    return expectedExtension ?? '.jpg';
  }

  private buildPublicUrl(fileName: string): string {
    const publicBaseUrl = this.configService.get<string>('PUBLIC_API_BASE_URL', '').replace(/\/$/, '');
    const path = `/api/v1/products/images/${fileName}`;
    return publicBaseUrl ? `${publicBaseUrl}${path}` : path;
  }
}
