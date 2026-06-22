import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { isValidObjectId, Types } from 'mongoose';
import { CategoriesService } from '../../categories/services/categories.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { Product } from '../schemas/product.schema';
import { ProductListResult, ProductsRepository } from '../repositories/products.repository';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly categoriesService: CategoriesService,
  ) {}

  async createProduct(dto: CreateProductDto): Promise<Product> {
    await this.ensureCategoryExists(dto.categoryId);

    return this.productsRepository.create({
      ...dto,
      categoryId: new Types.ObjectId(dto.categoryId),
      images: dto.images ?? [],
      isActive: dto.isActive ?? true,
    });
  }

  async updateProduct(id: string, dto: UpdateProductDto): Promise<Product> {
    this.ensureValidObjectId(id, 'Invalid product id');

    if (dto.categoryId) {
      await this.ensureCategoryExists(dto.categoryId);
    }

    const updateData: Partial<Product> = {
      ...dto,
      categoryId: dto.categoryId ? new Types.ObjectId(dto.categoryId) : undefined,
    };

    const product = await this.productsRepository.updateById(id, updateData);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async deleteProduct(id: string): Promise<Product> {
    this.ensureValidObjectId(id, 'Invalid product id');

    const product = await this.productsRepository.softDelete(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async getProductById(id: string): Promise<Product> {
    this.ensureValidObjectId(id, 'Invalid product id');

    const product = await this.productsRepository.findById(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async reduceStock(id: string, quantity: number): Promise<Product> {
    this.ensureValidObjectId(id, 'Invalid product id');

    const product = await this.productsRepository.reduceStock(id, quantity);
    if (!product) {
      throw new BadRequestException('Insufficient product stock');
    }

    return product;
  }

  async restoreStock(id: string, quantity: number): Promise<Product | null> {
    this.ensureValidObjectId(id, 'Invalid product id');
    return this.productsRepository.restoreStock(id, quantity);
  }

  async listProducts(
    page = 1,
    limit = 20,
    categoryId?: string,
  ): Promise<ProductListResult> {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 100);

    if (categoryId) {
      this.ensureValidObjectId(categoryId, 'Invalid category id');
      return this.productsRepository.findByCategory(categoryId, safePage, safeLimit);
    }

    return this.productsRepository.findActiveProducts(safePage, safeLimit);
  }

  private async ensureCategoryExists(categoryId: string): Promise<void> {
    this.ensureValidObjectId(categoryId, 'Invalid category id');

    const category = await this.categoriesService.getCategoryById(categoryId);
    if (!category) {
      throw new BadRequestException('Category not found');
    }
  }

  private ensureValidObjectId(id: string, message: string): void {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(message);
    }
  }
}
