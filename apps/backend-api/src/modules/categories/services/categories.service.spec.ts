import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesRepository } from '../repositories/categories.repository';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { Category } from '../schemas/category.schema';

const CATEGORY_ID = '507f1f77bcf86cd799439011';
const INVALID_ID = 'invalid-id';

const mockCategory: Category = {
  _id: CATEGORY_ID,
  name: 'موبایل',
  slug: 'mobile',
  deletedAt: null,
} as Category;

describe('CategoriesService', () => {
  let service: CategoriesService;
  let repository: {
    findById: jest.Mock;
    findBySlug: jest.Mock;
    findAll: jest.Mock;
    findAllPaginated: jest.Mock;
    create: jest.Mock;
    updateById: jest.Mock;
    softDelete: jest.Mock;
    hasActiveProducts: jest.Mock;
  };
  let redisService: {
    get: jest.Mock;
    set: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      findById: jest.fn().mockResolvedValue(mockCategory),
      findBySlug: jest.fn().mockResolvedValue(null),
      findAll: jest.fn().mockResolvedValue([mockCategory]),
      findAllPaginated: jest.fn().mockResolvedValue({
        items: [mockCategory],
        total: 1,
        page: 1,
        limit: 20,
      }),
      create: jest.fn().mockResolvedValue(mockCategory),
      updateById: jest.fn().mockResolvedValue(mockCategory),
      softDelete: jest.fn().mockResolvedValue(mockCategory),
      hasActiveProducts: jest.fn().mockResolvedValue(false),
    };

    redisService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: CategoriesRepository, useValue: repository },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── createCategory ────────────────────────────────────────────────
  describe('createCategory', () => {
    it('should create a category with normalized slug', async () => {
      const result = await service.createCategory({
        name: 'لپ‌تاپ',
        slug: ' Laptop ',
      });

      expect(result).toBe(mockCategory);
      expect(repository.findBySlug).toHaveBeenCalledWith('laptop');
      expect(repository.create).toHaveBeenCalledWith({ name: 'لپ‌تاپ', slug: 'laptop' });
    });

    it('should throw ConflictException when slug already exists', async () => {
      repository.findBySlug.mockResolvedValue(mockCategory);

      await expect(
        service.createCategory({ name: 'تکراری', slug: 'mobile' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── getCategoryById ───────────────────────────────────────────────
  describe('getCategoryById', () => {
    it('should return null for invalid object id', async () => {
      const result = await service.getCategoryById(INVALID_ID);
      expect(result).toBeNull();
      expect(repository.findById).not.toHaveBeenCalled();
    });

    it('should return category from repository when not cached', async () => {
      const result = await service.getCategoryById(CATEGORY_ID);
      expect(result).toBe(mockCategory);
      expect(repository.findById).toHaveBeenCalledWith(CATEGORY_ID);
    });

    it('should return category from Redis cache if available', async () => {
      redisService.get.mockResolvedValue(mockCategory);

      const result = await service.getCategoryById(CATEGORY_ID);
      expect(result).toBe(mockCategory);
      expect(repository.findById).not.toHaveBeenCalled();
    });

    it('should cache the category after fetching from repository', async () => {
      await service.getCategoryById(CATEGORY_ID);
      expect(redisService.set).toHaveBeenCalledWith(
        `category:${CATEGORY_ID}`,
        mockCategory,
        300,
      );
    });
  });

  // ── getCategoryByIdOrFail ─────────────────────────────────────────
  describe('getCategoryByIdOrFail', () => {
    it('should throw BadRequestException for invalid id', async () => {
      await expect(service.getCategoryByIdOrFail(INVALID_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when category not found', async () => {
      repository.findById.mockResolvedValue(null);
      redisService.get.mockResolvedValue(null);

      await expect(service.getCategoryByIdOrFail(CATEGORY_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── listCategories ────────────────────────────────────────────────
  describe('listCategories', () => {
    it('should return categories from repository when not cached', async () => {
      const result = await service.listCategories();
      expect(result).toEqual([mockCategory]);
      expect(repository.findAll).toHaveBeenCalled();
    });

    it('should return categories from Redis cache if available', async () => {
      const cached = [mockCategory];
      redisService.get.mockResolvedValue(cached);

      const result = await service.listCategories();
      expect(result).toEqual(cached);
      expect(repository.findAll).not.toHaveBeenCalled();
    });
  });

  // ── listCategoriesPaginated ───────────────────────────────────────
  describe('listCategoriesPaginated', () => {
    it('should delegate to repository with clamped values', async () => {
      const result = await service.listCategoriesPaginated(-1, 200);
      expect(repository.findAllPaginated).toHaveBeenCalledWith(1, 100);
    });
  });

  // ── updateCategory ────────────────────────────────────────────────
  describe('updateCategory', () => {
    it('should update a category and invalidate cache', async () => {
      const updated = { ...mockCategory, name: 'تبلت' } as Category;
      repository.updateById.mockResolvedValue(updated);

      const result = await service.updateCategory(CATEGORY_ID, { name: 'تبلت' });
      expect(result).toBe(updated);
      expect(repository.updateById).toHaveBeenCalledWith(CATEGORY_ID, { name: 'تبلت', slug: undefined });
    });

    it('should throw ConflictException when updating slug to an existing one', async () => {
      const otherCategory = { ...mockCategory, _id: '507f1f77bcf86cd799439099' } as Category;
      repository.findBySlug.mockResolvedValue(otherCategory);

      await expect(
        service.updateCategory(CATEGORY_ID, { slug: 'existing-slug' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow updating slug to the same category (no conflict)', async () => {
      repository.findBySlug.mockResolvedValue(mockCategory);
      repository.updateById.mockResolvedValue(mockCategory);

      const result = await service.updateCategory(CATEGORY_ID, { slug: 'mobile' });
      expect(result).toBe(mockCategory);
    });
  });

  // ── deleteCategory ────────────────────────────────────────────────
  describe('deleteCategory', () => {
    it('should soft-delete a category with no active products', async () => {
      const result = await service.deleteCategory(CATEGORY_ID);
      expect(result).toBe(mockCategory);
      expect(repository.hasActiveProducts).toHaveBeenCalledWith(CATEGORY_ID);
      expect(repository.softDelete).toHaveBeenCalledWith(CATEGORY_ID);
    });

    it('should throw ConflictException when category has active products', async () => {
      repository.hasActiveProducts.mockResolvedValue(true);

      await expect(service.deleteCategory(CATEGORY_ID)).rejects.toThrow(
        ConflictException,
      );
      expect(repository.softDelete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when soft-delete returns null', async () => {
      repository.softDelete.mockResolvedValue(null);

      await expect(service.deleteCategory(CATEGORY_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
