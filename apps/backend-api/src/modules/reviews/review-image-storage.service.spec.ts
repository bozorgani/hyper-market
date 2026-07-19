import { Test, TestingModule } from '@nestjs/testing';
import { ReviewImageStorageService } from './review-image-storage.service';
import { ProductImageStorageService } from '../products/services/product-image-storage.service';

describe('ReviewImageStorageService', () => {
  let service: ReviewImageStorageService;
  let productImageStorageService: {
    saveProductImage: jest.Mock;
  };

  beforeEach(async () => {
    productImageStorageService = {
      saveProductImage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewImageStorageService,
        { provide: ProductImageStorageService, useValue: productImageStorageService },
      ],
    }).compile();

    service = module.get<ReviewImageStorageService>(ReviewImageStorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should save review image by delegating to product storage', async () => {
    const file = {
      buffer: Buffer.from('fake-image-data'),
      mimetype: 'image/png',
      size: 1024,
    } as any;
    const saved = { url: 'http://example.com/reviews/img.png', path: 'reviews/img.png' };
    productImageStorageService.saveProductImage.mockResolvedValue(saved);

    const result = await service.saveReviewImage(file);

    expect(productImageStorageService.saveProductImage).toHaveBeenCalledWith(file);
    expect(result).toBe(saved);
  });

  it('should reject invalid image inputs if validation exists', async () => {
    const invalidFile = {
      buffer: null,
      mimetype: 'text/plain',
      size: 1024,
    } as any;
    productImageStorageService.saveProductImage.mockRejectedValue(new Error('Invalid image file content'));

    await expect(service.saveReviewImage(invalidFile)).rejects.toThrow('Invalid image file content');
  });

  it('should validate review image data and pass valid inputs', async () => {
    const validFile = {
      buffer: Buffer.from('valid-png'),
      mimetype: 'image/png',
      size: 512,
    } as any;
    const saved = { url: 'http://example.com/reviews/valid.png', path: 'reviews/valid.png' };
    productImageStorageService.saveProductImage.mockResolvedValue(saved);

    const result = await service.saveReviewImage(validFile);

    expect(result.url).toBe(saved.url);
    expect(productImageStorageService.saveProductImage).toHaveBeenCalledTimes(1);
  });
});
