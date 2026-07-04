import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isValidObjectId } from 'mongoose';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { getEntityId } from '../../../shared/utils/entity-id.util';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { CategoriesRepository, CategoryListResult } from '../repositories/categories.repository';
import { Category } from '../schemas/category.schema';

const CATEGORY_LIST_CACHE_TTL = 300; // 5 minutes — categories change rarely
const CATEGORY_ITEM_CACHE_TTL = 300;

@Injectable()
export class CategoriesService {
  private readonly LIST_CACHE_KEY = 'categories:list';

  constructor(
    private readonly categoriesRepository: CategoriesRepository,
    private readonly redisService: RedisService,
  ) {}

  async createCategory(data: CreateCategoryDto): Promise<Category> {
    const slug = this.normalizeSlug(data.slug);
    const existingCategory = await this.categoriesRepository.findBySlug(slug);

    if (existingCategory) {
      throw new ConflictException('Category slug already exists');
    }

    const category = await this.categoriesRepository.create({
      name: data.name,
      slug,
    });

    await this.invalidateCategoryCaches();

    return category;
  }

  async getCategoryById(id: string): Promise<Category | null> {
    if (!isValidObjectId(id)) return null;

    // Try cache
    try {
      const cached = await this.redisService.get<Category>(`category:${id}`);
      if (cached) return cached;
    } catch {
      // fall through
    }

    const category = await this.categoriesRepository.findById(id);

    if (category) {
      void this.redisService.set(`category:${id}`, category, CATEGORY_ITEM_CACHE_TTL).catch(() => undefined);
    }

    return category;
  }

  async getCategoryByIdOrFail(id: string): Promise<Category> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid category id');
    }

    const category = await this.getCategoryById(id);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async getCategoryBySlug(slug: string): Promise<Category | null> {
    return this.categoriesRepository.findBySlug(this.normalizeSlug(slug));
  }

  async listCategories(): Promise<Category[]> {
    // Try cache
    try {
      const cached = await this.redisService.get<Category[]>(this.LIST_CACHE_KEY);
      if (cached) return cached;
    } catch {
      // fall through
    }

    const categories = await this.categoriesRepository.findAll();

    void this.redisService.set(this.LIST_CACHE_KEY, categories, CATEGORY_LIST_CACHE_TTL).catch(() => undefined);

    return categories;
  }

  async listCategoriesPaginated(
    page: number,
    limit: number,
  ): Promise<CategoryListResult> {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    return this.categoriesRepository.findAllPaginated(safePage, safeLimit);
  }

  async updateCategory(id: string, data: UpdateCategoryDto): Promise<Category> {
    await this.getCategoryByIdOrFail(id);

    const updateData: Partial<Category> = {
      ...data,
      slug: data.slug ? this.normalizeSlug(data.slug) : undefined,
    };

    if (updateData.slug) {
      const existingCategory = await this.categoriesRepository.findBySlug(
        updateData.slug,
      );

      if (existingCategory && getEntityId(existingCategory) !== id) {
        throw new ConflictException('Category slug already exists');
      }
    }

    const category = await this.categoriesRepository.updateById(id, updateData);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    await this.invalidateCategoryCaches(id);

    return category;
  }

  async deleteCategory(id: string): Promise<Category> {
    await this.getCategoryByIdOrFail(id);

    const hasActiveProducts = await this.categoriesRepository.hasActiveProducts(id);
    if (hasActiveProducts) {
      throw new ConflictException('Category has active products and cannot be deleted');
    }

    const category = await this.categoriesRepository.softDelete(id);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    await this.invalidateCategoryCaches(id);

    return category;
  }

  private async invalidateCategoryCaches(id?: string): Promise<void> {
    try {
      if (id) {
        await this.redisService.delete(`category:${id}`);
      }
      await this.redisService.delete(this.LIST_CACHE_KEY);
    } catch {
      // Cache invalidation must not break the write path
    }
  }

  private normalizeSlug(slug: string): string {
    return slug.trim().toLowerCase();
  }
}
