import { Injectable } from '@nestjs/common';
import { CategoriesRepository } from '../repositories/categories.repository';
import { Category } from '../schemas/category.schema';

@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async createCategory(data: Partial<Category>): Promise<Category> {
    return this.categoriesRepository.create(data);
  }

  async getCategoryById(id: string): Promise<Category | null> {
    return this.categoriesRepository.findById(id);
  }

  async getCategoryBySlug(slug: string): Promise<Category | null> {
    return this.categoriesRepository.findBySlug(slug);
  }

  async listCategories(): Promise<Category[]> {
    return this.categoriesRepository.findAll();
  }
}
