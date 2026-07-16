import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { WishlistRepository } from './wishlist.repository';
import { ProductsService } from '../products/services/products.service';

const PRODUCT_ID = '507f1f77bcf86cd799439011';
const USER_ID = 'user-123';

const mockProduct = {
  _id: PRODUCT_ID,
  name: 'Test Product',
  isActive: true,
};

const mockWishlist = {
  userId: USER_ID,
  products: [mockProduct],
};

describe('WishlistService', () => {
  let service: WishlistService;
  let repository: {
    getWishlist: jest.Mock;
    isInWishlist: jest.Mock;
    addToWishlist: jest.Mock;
    removeFromWishlist: jest.Mock;
    clearWishlist: jest.Mock;
    getWishlistCount: jest.Mock;
    getWishlistProductIds: jest.Mock;
  };
  let productsService: {
    getProductById: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      getWishlist: jest.fn().mockResolvedValue(mockWishlist),
      isInWishlist: jest.fn().mockResolvedValue(false),
      addToWishlist: jest.fn().mockResolvedValue({ products: [mockProduct] }),
      removeFromWishlist: jest.fn().mockResolvedValue({ products: [] }),
      clearWishlist: jest.fn().mockResolvedValue({ products: [] }),
      getWishlistCount: jest.fn().mockResolvedValue(1),
      getWishlistProductIds: jest.fn().mockResolvedValue([PRODUCT_ID]),
    };

    productsService = {
      getProductById: jest.fn().mockResolvedValue(mockProduct),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WishlistService,
        { provide: WishlistRepository, useValue: repository },
        { provide: ProductsService, useValue: productsService },
      ],
    }).compile();

    service = module.get<WishlistService>(WishlistService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getWishlist', () => {
    it('should successfully get paginated wishlist', async () => {
      const result = await service.getWishlist(USER_ID, 1, 10);
      expect(result.products.length).toBe(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should return empty pagination when wishlist is empty', async () => {
      repository.getWishlist.mockResolvedValue(null);
      const result = await service.getWishlist(USER_ID, 1, 10);
      expect(result.products).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('addToWishlist', () => {
    it('should successfully add active product to wishlist', async () => {
      const result = await service.addToWishlist(USER_ID, PRODUCT_ID);
      expect(result.message).toBe('Product added to wishlist');
      expect(repository.addToWishlist).toHaveBeenCalledWith(USER_ID, PRODUCT_ID);
    });

    it('should throw NotFoundException if product does not exist', async () => {
      productsService.getProductById.mockResolvedValue(null);
      await expect(service.addToWishlist(USER_ID, PRODUCT_ID)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if product is inactive', async () => {
      productsService.getProductById.mockResolvedValue({ ...mockProduct, isActive: false });
      await expect(service.addToWishlist(USER_ID, PRODUCT_ID)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if product is already in wishlist', async () => {
      repository.isInWishlist.mockResolvedValue(true);
      await expect(service.addToWishlist(USER_ID, PRODUCT_ID)).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeFromWishlist', () => {
    it('should successfully remove product from wishlist', async () => {
      repository.isInWishlist.mockResolvedValue(true);
      const result = await service.removeFromWishlist(USER_ID, PRODUCT_ID);
      expect(result.message).toBe('Product removed from wishlist');
    });

    it('should throw NotFoundException if product is not in wishlist', async () => {
      repository.isInWishlist.mockResolvedValue(false);
      await expect(service.removeFromWishlist(USER_ID, PRODUCT_ID)).rejects.toThrow(NotFoundException);
    });
  });
});
