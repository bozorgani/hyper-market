import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ClientSession, isValidObjectId, Types } from 'mongoose';
import { EventBusService } from '../../../core/events/event-bus.service';
import { EventType } from '../../../core/events/enums/event-type.enum';
import { CategoriesService } from '../../categories/services/categories.service';
import { SearchIndexer } from '../../search/search.indexer';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { Product } from '../schemas/product.schema';
import { ProductListResult, ProductsRepository } from '../repositories/products.repository';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly categoriesService: CategoriesService,
    private readonly searchIndexer: SearchIndexer,
    private readonly eventBusService: EventBusService,
  ) {}

  async createProduct(dto: CreateProductDto): Promise<Product> {
    await this.ensureCategoryExists(dto.categoryId);

    const product = await this.productsRepository.create({
      ...dto,
      categoryId: new Types.ObjectId(dto.categoryId),
      images: dto.images ?? [],
      isActive: dto.isActive ?? true,
    });

    await this.searchIndexer.indexProduct(product);

    this.eventBusService.emit({
      type: EventType.PRODUCT_CREATED,
      payload: { product },
      timestamp: Date.now(),
    });

    return product;
  }

  async updateProduct(id: string, dto: UpdateProductDto): Promise<Product> {
    this.ensureValidObjectId(id, 'Invalid product id');

    if (dto.categoryId) {
      await this.ensureCategoryExists(dto.categoryId);
    }

    if (dto.stock !== undefined) {
      await this.ensureStockCanCoverActiveOrders(id, dto.stock);
    }

    const updateData: Partial<Product> = {
      ...dto,
      categoryId: dto.categoryId ? new Types.ObjectId(dto.categoryId) : undefined,
    };

    const product = await this.productsRepository.updateById(id, updateData);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.searchIndexer.indexProduct(product);

    return product;
  }

  async deleteProduct(id: string): Promise<Product> {
    this.ensureValidObjectId(id, 'Invalid product id');

    const product = await this.productsRepository.softDelete(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.searchIndexer.removeProduct(id);

    return product;
  }

  async getProductById(id: string, session?: ClientSession): Promise<Product> {
    this.ensureValidObjectId(id, 'Invalid product id');

    const product = await this.productsRepository.findById(id, session);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }


  async getProductsByIds(ids: string[]): Promise<Product[]> {
    const uniqueIds = [...new Set(ids)];
    for (const id of uniqueIds) {
      this.ensureValidObjectId(id, 'Invalid product id');
    }

    return this.productsRepository.findByIds(uniqueIds);
  }

  async reduceStock(
    id: string,
    quantity: number,
    session?: ClientSession,
    syncSearch = true,
  ): Promise<Product> {
    this.ensureValidObjectId(id, 'Invalid product id');

    const product = await this.productsRepository.reduceStock(id, quantity, session);
    if (!product) {
      throw new BadRequestException('Insufficient product stock');
    }

    if (syncSearch) {
      await this.searchIndexer.indexProduct(product);
    }

    return product;
  }

  async restoreStock(
    id: string,
    quantity: number,
    session?: ClientSession,
    syncSearch = true,
  ): Promise<Product | null> {
    this.ensureValidObjectId(id, 'Invalid product id');
    const product = await this.productsRepository.restoreStock(id, quantity, session);

    if (product && syncSearch) {
      await this.searchIndexer.indexProduct(product);
    }

    return product;
  }

  async syncProductToSearch(id: string): Promise<void> {
    const product = await this.getProductById(id);
    await this.searchIndexer.indexProduct(product);
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

  private async ensureStockCanCoverActiveOrders(
    productId: string,
    nextStock: number,
  ): Promise<void> {
    if (nextStock < 0) {
      throw new BadRequestException('Product stock cannot be negative');
    }

    const activeOrderQuantity =
      await this.productsRepository.getActiveOrderQuantityForProduct(productId);

    if (nextStock < activeOrderQuantity) {
      throw new BadRequestException(
        `Product stock cannot be lower than active order quantity (${activeOrderQuantity})`,
      );
    }
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
