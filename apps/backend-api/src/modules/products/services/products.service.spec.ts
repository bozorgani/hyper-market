import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ProductsService } from './products.service';
import { ProductsRepository } from '../repositories/products.repository';
import { CategoriesService } from '../../categories/services/categories.service';
import { SearchIndexer } from '../../search/search.indexer';
import { EventBusService } from '../../../core/events/event-bus.service';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { Product } from '../schemas/product.schema';

const PRODUCT_ID = new Types.ObjectId().toHexString();
const CATEGORY_ID = new Types.ObjectId().toHexString();
const INVALID_ID = 'invalid';

const mockProduct: Product = {
  _id: PRODUCT_ID,
  name: 'گوشی Samsung',
  description: 'گوشی موبایل سامسونگ',
  price: 25_000_000,
  discountPrice: null,
  stock: 10,
  images: [],
  categoryId: new Types.ObjectId(CATEGORY_ID),
  isActive: true,
  brand: 'Samsung',
  sku: 'SAM-GAL-S24-128',
  unit: 'عدد',
  weight: 196,
  tags: ['موبایل', 'سامسونگ'],
  deletedAt: null,
} as Product;

describe('ProductsService', () => {
  let service: ProductsService;
  let productsRepository: {
    findById: jest.Mock;
    findByIds: jest.Mock;
    create: jest.Mock;
    updateById: jest.Mock;
    softDelete: jest.Mock;
    reduceStock: jest.Mock;
    restoreStock: jest.Mock;
    findActiveProducts: jest.Mock;
    findByCategory: jest.Mock;
    getActiveOrderQuantityForProduct: jest.Mock;
  };
  let categoriesService: { getCategoryById: jest.Mock };
  let searchIndexer: { indexProduct: jest.Mock; removeProduct: jest.Mock };
  let eventBusService: { emit: jest.Mock };
  let redisService: { get: jest.Mock; set: jest.Mock; delete: jest.Mock };

  beforeEach(async () => {
    productsRepository = {
      findById: jest.fn().mockResolvedValue(mockProduct),
      findByIds: jest.fn().mockResolvedValue([mockProduct]),
      create: jest.fn().mockResolvedValue(mockProduct),
      updateById: jest.fn().mockResolvedValue(mockProduct),
      softDelete: jest.fn().mockResolvedValue(mockProduct),
      reduceStock: jest.fn().mockResolvedValue(mockProduct),
      restoreStock: jest.fn().mockResolvedValue(mockProduct),
      findActiveProducts: jest.fn().mockResolvedValue({ items: [mockProduct], total: 1, page: 1, limit: 20 }),
      findByCategory: jest.fn().mockResolvedValue({ items: [mockProduct], total: 1, page: 1, limit: 20 }),
      getActiveOrderQuantityForProduct: jest.fn().mockResolvedValue(0),
    };

    categoriesService = {
      getCategoryById: jest.fn().mockResolvedValue({ _id: CATEGORY_ID, name: 'موبایل', slug: 'mobile' }),
    };

    searchIndexer = {
      indexProduct: jest.fn().mockResolvedValue(undefined),
      removeProduct: jest.fn().mockResolvedValue(undefined),
    };

    eventBusService = { emit: jest.fn() };

    redisService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: ProductsRepository, useValue: productsRepository },
        { provide: CategoriesService, useValue: categoriesService },
        { provide: SearchIndexer, useValue: searchIndexer },
        { provide: EventBusService, useValue: eventBusService },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── createProduct ─────────────────────────────────────────────────
  describe('createProduct', () => {
    it('should create a product and index it', async () => {
      const result = await service.createProduct({
        name: 'گوشی جدید',
        description: 'تست',
        price: 10_000_000,
        stock: 5,
        categoryId: CATEGORY_ID,
      });

      expect(result).toBe(mockProduct);
      expect(productsRepository.create).toHaveBeenCalled();
      expect(searchIndexer.indexProduct).toHaveBeenCalledWith(mockProduct);
      expect(eventBusService.emit).toHaveBeenCalled();
    });

    it('should throw BadRequestException when category does not exist', async () => {
      categoriesService.getCategoryById.mockResolvedValue(null);

      await expect(
        service.createProduct({ name: 'X', description: 'Y', price: 100, stock: 1, categoryId: INVALID_ID }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── getProductById ────────────────────────────────────────────────
  describe('getProductById', () => {
    it('should throw BadRequestException for invalid id', async () => {
      await expect(service.getProductById(INVALID_ID)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when product not found', async () => {
      productsRepository.findById.mockResolvedValue(null);

      await expect(service.getProductById(PRODUCT_ID)).rejects.toThrow(NotFoundException);
    });

    it('should return product from cache when available', async () => {
      redisService.get.mockResolvedValue(mockProduct);

      const result = await service.getProductById(PRODUCT_ID);
      expect(result).toBe(mockProduct);
      expect(productsRepository.findById).not.toHaveBeenCalled();
    });

    it('should skip cache when inside a transaction (session provided)', async () => {
      const session = {} as any;
      redisService.get.mockResolvedValue(mockProduct);

      const result = await service.getProductById(PRODUCT_ID, session);
      expect(productsRepository.findById).toHaveBeenCalledWith(PRODUCT_ID, session);
    });
  });

  // ── updateProduct ─────────────────────────────────────────────────
  describe('updateProduct', () => {
    it('should update and re-index product', async () => {
      const result = await service.updateProduct(PRODUCT_ID, { name: 'گوشی آپدیت شده' });
      expect(result).toBe(mockProduct);
      expect(searchIndexer.indexProduct).toHaveBeenCalled();
    });

    it('should throw BadRequestException when stock would be below active orders', async () => {
      productsRepository.getActiveOrderQuantityForProduct.mockResolvedValue(5);

      await expect(
        service.updateProduct(PRODUCT_ID, { stock: 2 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when stock is negative', async () => {
      await expect(
        service.updateProduct(PRODUCT_ID, { stock: -1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when product not found after update', async () => {
      productsRepository.updateById.mockResolvedValue(null);

      await expect(
        service.updateProduct(PRODUCT_ID, { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── deleteProduct ─────────────────────────────────────────────────
  describe('deleteProduct', () => {
    it('should soft-delete and remove from search index', async () => {
      const result = await service.deleteProduct(PRODUCT_ID);
      expect(result).toBe(mockProduct);
      expect(productsRepository.softDelete).toHaveBeenCalledWith(PRODUCT_ID);
      expect(searchIndexer.removeProduct).toHaveBeenCalledWith(PRODUCT_ID);
    });

    it('should throw NotFoundException when product not found', async () => {
      productsRepository.softDelete.mockResolvedValue(null);

      await expect(service.deleteProduct(PRODUCT_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ── reduceStock / restoreStock ────────────────────────────────────
  describe('reduceStock', () => {
    it('should reduce stock and invalidate cache', async () => {
      const result = await service.reduceStock(PRODUCT_ID, 2);
      expect(result).toBe(mockProduct);
      expect(productsRepository.reduceStock).toHaveBeenCalledWith(PRODUCT_ID, 2, undefined);
    });

    it('should throw BadRequestException when insufficient stock', async () => {
      productsRepository.reduceStock.mockResolvedValue(null);

      await expect(service.reduceStock(PRODUCT_ID, 999)).rejects.toThrow(BadRequestException);
    });

    it('should skip search sync when syncSearch=false', async () => {
      await service.reduceStock(PRODUCT_ID, 1, undefined, false);
      expect(searchIndexer.indexProduct).not.toHaveBeenCalled();
    });
  });

  describe('restoreStock', () => {
    it('should restore stock and re-index', async () => {
      const result = await service.restoreStock(PRODUCT_ID, 3);
      expect(result).toBe(mockProduct);
      expect(searchIndexer.indexProduct).toHaveBeenCalled();
    });

    it('should skip search sync when syncSearch=false', async () => {
      await service.restoreStock(PRODUCT_ID, 1, undefined, false);
      expect(searchIndexer.indexProduct).not.toHaveBeenCalled();
    });
  });

  // ── listProducts ──────────────────────────────────────────────────
  describe('listProducts', () => {
    it('should list active products without category filter', async () => {
      const result = await service.listProducts(1, 20);
      expect(result.items).toHaveLength(1);
      expect(productsRepository.findActiveProducts).toHaveBeenCalled();
    });

    it('should list products by category', async () => {
      const result = await service.listProducts(1, 20, CATEGORY_ID);
      expect(productsRepository.findByCategory).toHaveBeenCalledWith(CATEGORY_ID, 1, 20, undefined, undefined);
    });

    it('should clamp page and limit', async () => {
      await service.listProducts(-1, 200);
      expect(productsRepository.findActiveProducts).toHaveBeenCalledWith(1, 100, undefined, undefined);
    });

    it('should return cached list when available', async () => {
      const cached = { items: [mockProduct], total: 1, page: 1, limit: 20 };
      redisService.get.mockResolvedValue(cached);

      const result = await service.listProducts();
      expect(result).toEqual(cached);
      expect(productsRepository.findActiveProducts).not.toHaveBeenCalled();
    });
  });

  // ── getProductsByIds ──────────────────────────────────────────────
  describe('getProductsByIds', () => {
    it('should return products by ids', async () => {
      const result = await service.getProductsByIds([PRODUCT_ID]);
      expect(result).toEqual([mockProduct]);
    });

    it('should throw for invalid ids', async () => {
      await expect(service.getProductsByIds([INVALID_ID])).rejects.toThrow(BadRequestException);
    });
  });
});
