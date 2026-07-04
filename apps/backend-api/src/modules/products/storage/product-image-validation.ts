import { BadRequestException } from '@nestjs/common';
import { UploadableFile } from './product-image-storage.interface';

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export function createProductImageMulterLimits(maxFileSizeBytes: number) {
  return {
    fileSize: maxFileSizeBytes,
    files: 1,
    fields: 0,
    fieldNameSize: 100,
    parts: 1,
  };
}

export function productImageFileFilter(
  _request: unknown,
  file: { mimetype?: string },
  callback: (error: Error | null, acceptFile: boolean) => void,
): void {
  if (!file?.mimetype || !ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
    callback(
      new BadRequestException('Only jpg, png, webp and gif images are allowed'),
      false,
    );
    return;
  }

  callback(null, true);
}

export function validateProductImageFile(
  file: UploadableFile,
  maxFileSizeBytes: number,
): void {
  if (!file?.buffer || !file.mimetype) {
    throw new BadRequestException('Image file is required');
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
    throw new BadRequestException('Only jpg, png, webp and gif images are allowed');
  }

  if ((file.size ?? file.buffer.length) > maxFileSizeBytes) {
    throw new BadRequestException('Image file is too large');
  }

  const detectedMimeType = detectImageMimeType(file.buffer);
  if (!detectedMimeType) {
    throw new BadRequestException('Invalid image file content');
  }

  if (detectedMimeType !== file.mimetype) {
    throw new BadRequestException('Image MIME type does not match file content');
  }
}

export function detectImageMimeType(buffer: Buffer): string | null {
  if (isJpeg(buffer)) return 'image/jpeg';
  if (isPng(buffer)) return 'image/png';
  if (isGif(buffer)) return 'image/gif';
  if (isWebp(buffer)) return 'image/webp';
  return null;
}

function isJpeg(buffer: Buffer): boolean {
  return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

function isPng(buffer: Buffer): boolean {
  return (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  );
}

function isGif(buffer: Buffer): boolean {
  if (buffer.length < 6) return false;
  const signature = buffer.subarray(0, 6).toString('ascii');
  return signature === 'GIF87a' || signature === 'GIF89a';
}

function isWebp(buffer: Buffer): boolean {
  return (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  );
}
