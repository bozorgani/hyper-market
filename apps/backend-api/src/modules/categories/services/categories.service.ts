import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isValidObjectId } from 'mongoose';
import { getEntityId } from '../../../shared/utils/entity-id.util';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { CategoriesRepository } from '../repositories/categories.repository';
import { Category } from '../schemas/category.schema';

@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async createCategory(data: CreateCategoryDto): Promise<Category> {
    const slug = this.normalizeSlug(data.slug);
    const existingCategory = await this.categoriesRepository.findBySlug(slug);

    if (existingCategory) {
      throw new ConflictException('Category slug already exists');
    }

    return this.categoriesRepository.create({
      name: data.name,
      slug,
    });
  }

  async getCategoryById(id: string): Promise<Category | null> {
    if (!isValidObjectId(id)) return null;
    return this.categoriesRepository.findById(id);
  }

  async getCategoryByIdOrFail(id: string): Promise<Category> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid category id');
    }

    const category = await this.categoriesRepository.findById(id);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async getCategoryBySlug(slug: string): Promise<Category | null> {
    return this.categoriesRepository.findBySlug(this.normalizeSlug(slug));
  }

  async listCategories(): Promise<Category[]> {
    return this.categoriesRepository.findAll();
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

    return category;
  }

  private normalizeSlug(slug: string): string {
    return slug.trim().toLowerCase();
  }
}
