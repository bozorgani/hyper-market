import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { IProductImageStorage, SavedImage, UploadableFile } from './product-image-storage.interface';
import { LoggerService } from '../../../infrastructure/logger/logger.service';
import { validateProductImageFile } from './product-image-validation';

/**
 * S3-compatible object storage driver.
 *
 * Uploads product images to an S3-compatible bucket (AWS S3, MinIO, etc.)
 * and returns the public URL. No local filesystem is used.
 *
 * ⚠️  Requires the `@aws-sdk/client-s3` package to be installed.
 *     When STORAGE_DRIVER=s3 is set but the SDK is missing, the
 *     application will fail to start with a clear error message.
 *
 * Env vars used:
 *   S3_ENDPOINT       — custom endpoint (e.g. MinIO); omit for AWS
 *   S3_REGION         — bucket region (default: us-east-1)
 *   S3_BUCKET         — bucket name (required)
 *   S3_ACCESS_KEY_ID  — access key (required)
 *   S3_SECRET_ACCESS_KEY — secret key (required)
 *   S3_PUBLIC_URL     — base URL for generating public image URLs
 *                        (default: https://{bucket}.s3.{region}.amazonaws.com)
 *   PRODUCT_IMAGE_MAX_BYTES — max upload size (default: 5 MB)
 */
@Injectable()
export class S3ProductImageStorage implements IProductImageStorage, OnModuleInit {
  private readonly maxFileSizeBytes: number;
  private readonly bucket: string;
  private readonly publicUrl: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private s3Client: any = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly loggerService: LoggerService,
  ) {
    this.maxFileSizeBytes = Number(
      this.configService.get<string>('PRODUCT_IMAGE_MAX_BYTES', '5242880'),
    );
    this.bucket = this.configService.get<string>('S3_BUCKET', '');
    const region = this.configService.get<string>('S3_REGION', 'us-east-1');
    this.publicUrl = this.configService.get<string>(
      'S3_PUBLIC_URL',
      `https://${this.bucket}.s3.${region}.amazonaws.com`,
    ).replace(/\/$/, '');
  }

  async onModuleInit(): Promise<void> {
    try {
      // Dynamic import so the application doesn't crash at require-time
      // when @aws-sdk/client-s3 is not installed (only fails if S3 is selected).
      // @ts-expect-error — module may not be installed yet; error is caught below
      const s3Module = await import('@aws-sdk/client-s3');

      const endpoint = this.configService.get<string>('S3_ENDPOINT');
      const region = this.configService.get<string>('S3_REGION', 'us-east-1');
      const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY_ID', '');
      const secretAccessKey = this.configService.get<string>('S3_SECRET_ACCESS_KEY', '');

      this.s3Client = new s3Module.S3Client({
        ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
        region,
        credentials: { accessKeyId, secretAccessKey },
      });

      this.loggerService.info('[S3 Storage] Client initialized', {
        bucket: this.bucket,
        region,
        endpoint: endpoint || 'default AWS',
      });
    } catch (error) {
      throw new Error(
        '[S3 Storage] STORAGE_DRIVER=s3 requires the @aws-sdk/client-s3 package. ' +
        'Install it with: pnpm add @aws-sdk/client-s3 — then restart the application. ' +
        `Original error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async saveProductImage(file: UploadableFile): Promise<SavedImage> {
    if (!this.s3Client) {
      throw new BadRequestException('S3 storage is not configured');
    }

    validateProductImageFile(file, this.maxFileSizeBytes);
    const buffer = file.buffer as Buffer;
    const mimeType = file.mimetype as string;

    const extension = this.getSafeExtension(file.originalname, mimeType);
    const fileName = `products/${Date.now()}-${randomUUID()}${extension}`;

    // @ts-expect-error — dynamic import resolved in onModuleInit
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileName,
        Body: buffer,
        ContentType: mimeType,
      }),
    );

    return {
      url: this.getImageUrl(fileName),
      fileName,
      size: file.size ?? buffer.length,
      mimeType,
    };
  }

  /**
   * S3 images are served directly from the bucket — no local path needed.
   */
  getImageUrl(fileName: string): string {
    return `${this.publicUrl}/${fileName}`;
  }

  private getSafeExtension(originalName: string | undefined, mimeType: string): string {
    const EXTENSIONS: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
    };

    const originalExtension = extname(originalName ?? '').toLowerCase();
    if (originalExtension && ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(originalExtension)) {
      return originalExtension === '.jpeg' ? '.jpg' : originalExtension;
    }

    return EXTENSIONS[mimeType] ?? '.jpg';
  }
}
