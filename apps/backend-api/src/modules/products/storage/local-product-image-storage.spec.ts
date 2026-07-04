import { LocalProductImageStorage } from './local-product-image-storage';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

// Mock fs/promises
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
}));

const validJpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

describe('LocalProductImageStorage', () => {
  let storage: LocalProductImageStorage;
  let configService: ConfigService;

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        const map: Record<string, string> = {
          PRODUCT_IMAGE_MAX_BYTES: '5242880',
          PRODUCT_IMAGE_UPLOAD_DIR: '/tmp/test-uploads',
          PUBLIC_API_BASE_URL: 'http://localhost:3000',
        };
        return map[key] ?? defaultValue ?? '';
      }),
    } as any;

    storage = new LocalProductImageStorage(configService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── saveProductImage ──────────────────────────────────────────────
  describe('saveProductImage', () => {
    it('should save a valid JPEG image', async () => {
      const file = {
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: validJpegBuffer,
      };

      const result = await storage.saveProductImage(file);

      expect(result.mimeType).toBe('image/jpeg');
      expect(result.url).toContain('/api/v1/products/images/');
      expect(result.fileName).toMatch(/\.jpg$/);
      expect(mkdir).toHaveBeenCalledWith('/tmp/test-uploads', { recursive: true });
      expect(writeFile).toHaveBeenCalled();
    });

    it('should reject unsupported MIME types', async () => {
      const file = {
        originalname: 'file.pdf',
        mimetype: 'application/pdf',
        size: 100,
        buffer: Buffer.from('data'),
      };

      await expect(storage.saveProductImage(file)).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid image magic bytes even when MIME type is allowed', async () => {
      const file = {
        originalname: 'fake.jpg',
        mimetype: 'image/jpeg',
        size: 100,
        buffer: Buffer.from('not-a-real-image'),
      };

      await expect(storage.saveProductImage(file)).rejects.toThrow(BadRequestException);
    });

    it('should reject when declared MIME type does not match file content', async () => {
      const file = {
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
        size: validPngBuffer.length,
        buffer: validPngBuffer,
      };

      await expect(storage.saveProductImage(file)).rejects.toThrow(BadRequestException);
    });

    it('should reject files that are too large', async () => {
      const file = {
        originalname: 'big.jpg',
        mimetype: 'image/jpeg',
        size: 10_000_000,
        buffer: Buffer.alloc(10_000_000),
      };

      await expect(storage.saveProductImage(file)).rejects.toThrow(BadRequestException);
    });

    it('should reject when file buffer is missing', async () => {
      const file = { originalname: 'none.jpg', mimetype: 'image/jpeg' };

      await expect(storage.saveProductImage(file as any)).rejects.toThrow(BadRequestException);
    });
  });

  // ── getImagePath ──────────────────────────────────────────────────
  describe('getImagePath', () => {
    it('should return full filesystem path for a valid fileName', () => {
      const result = storage.getImagePath('1234-photo.jpg');
      expect(result).toBe(join('/tmp/test-uploads', '1234-photo.jpg'));
    });

    it('should reject malicious file names with path traversal', () => {
      expect(() => storage.getImagePath('../../../etc/passwd')).toThrow(BadRequestException);
    });

    it('should reject file names with spaces', () => {
      expect(() => storage.getImagePath('my file.jpg')).toThrow(BadRequestException);
    });
  });

  // ── getImageUrl ───────────────────────────────────────────────────
  describe('getImageUrl', () => {
    it('should build URL with public base URL when configured', () => {
      const url = storage.getImageUrl('photo.jpg');
      expect(url).toBe('http://localhost:3000/api/v1/products/images/photo.jpg');
    });

    it('should build relative URL when no base URL configured', () => {
      // Create storage without PUBLIC_API_BASE_URL
      const noBaseConfigService = {
        get: jest.fn((key: string, defaultValue?: string) => {
          if (key === 'PUBLIC_API_BASE_URL') return '';
          if (key === 'PRODUCT_IMAGE_UPLOAD_DIR') return '/tmp/uploads';
          if (key === 'PRODUCT_IMAGE_MAX_BYTES') return '5242880';
          return defaultValue ?? '';
        }),
      } as any;

      const noBaseStorage = new LocalProductImageStorage(noBaseConfigService);
      const url = noBaseStorage.getImageUrl('photo.jpg');
      expect(url).toBe('/api/v1/products/images/photo.jpg');
    });
  });
});
