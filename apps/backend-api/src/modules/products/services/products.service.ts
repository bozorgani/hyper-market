import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ClientSession, isValidObjectId, Types } from 'mongoose';
import { EventBusService } from '../../../core/events/event-bus.service';
import { EventType } from '../../../core/events/enums/event-type.enum';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { CategoriesService } from '../../categories/services/categories.service';
import { SearchIndexer } from '../../search/search.indexer';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { Product } from '../schemas/product.schema';
import { ProductListResult, ProductsRepository } from '../repositories/products.repository';

const PRODUCT_CACHE_TTL = 120;    // 2 minutes
const PRODUCT_LIST_CACHE_TTL = 120;

@Injectable()
export class ProductsService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly categoriesService: CategoriesService,
    private readonly searchIndexer: SearchIndexer,
    private readonly eventBusService: EventBusService,
    private readonly redisService: RedisService,
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

    // Invalidate list caches
    await this.invalidateProductListCaches();

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

    // Invalidate specific product + list caches
    await this.invalidateProductCache(id);

    return product;
  }

  async deleteProduct(id: string): Promise<Product> {
    this.ensureValidObjectId(id, 'Invalid product id');

    const product = await this.productsRepository.softDelete(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.searchIndexer.removeProduct(id);

    // Invalidate specific product + list caches
    await this.invalidateProductCache(id);

    return product;
  }

  async getProductById(id: string, session?: ClientSession): Promise<Product> {
    this.ensureValidObjectId(id, 'Invalid product id');

    // Skip cache when inside a transaction (must read committed data)
    if (!session) {
      try {
        const cached = await this.redisService.get<Product>(`product:${id}`);
        if (cached) {
          return cached;
        }
      } catch {
        // Cache miss — fall through to DB
      }
    }

    const product = await this.productsRepository.findById(id, session);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Cache the result (skip if inside a transaction — data may be uncommitted)
    if (!session) {
      void this.redisService.set(`product:${id}`, product, PRODUCT_CACHE_TTL).catch(() => undefined);
    }

    return product;
  }

  async getPublicProductById(id: string): Promise<Product> {
    this.ensureValidObjectId(id, 'Invalid product id');

    try {
      const cached = await this.redisService.get<Product>(`product:public:${id}`);
      if (cached) {
        return cached;
      }
    } catch {
      // Cache miss — fall through to DB
    }

    const product = await this.productsRepository.findPublicById(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    void this.redisService.set(`product:public:${id}`, product, PRODUCT_CACHE_TTL).catch(() => undefined);
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

    // Invalidate cache after stock change
    await this.invalidateProductCache(id);

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

    // Invalidate cache after stock change
    await this.invalidateProductCache(id);

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
    search?: string,
    isActive?: boolean,
  ): Promise<ProductListResult> {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 100);

    // Build a cache key from all query parameters
    const cacheKey = `products:list:${safePage}:${safeLimit}:${categoryId ?? 'all'}:${search ?? 'none'}:${isActive ?? 'any'}`;

    // Try cache
    try {
      const cached = await this.redisService.get<ProductListResult>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch {
      // Cache miss — fall through
    }

    let result: ProductListResult;
    if (categoryId) {
      this.ensureValidObjectId(categoryId, 'Invalid category id');
      result = await this.productsRepository.findByCategory(categoryId, safePage, safeLimit, search, isActive);
    } else {
      result = await this.productsRepository.findActiveProducts(safePage, safeLimit, search, isActive);
    }

    // Store in cache
    void this.redisService.set(cacheKey, result, PRODUCT_LIST_CACHE_TTL).catch(() => undefined);

    return result;
  }

  private async invalidateProductCache(id: string): Promise<void> {
    try {
      await this.redisService.delete(`product:${id}`);
      await this.redisService.delete(`product:public:${id}`);
      await this.invalidateProductListCaches();
    } catch {
      // Cache invalidation failure must not break the write path
    }
  }

  private async invalidateProductListCaches(): Promise<void> {
    try {
      // Delete all product list cache keys using a scan pattern
      const rawClient = (this.redisService as any).client;
      if (rawClient) {
        const stream = rawClient.scanStream({ match: 'products:list:*', count: 100 });
        const keys: string[] = [];
        stream.on('data', (foundKeys: string[]) => keys.push(...foundKeys));
        await new Promise<void>((resolve) => {
          stream.on('end', async () => {
            if (keys.length > 0) {
              await rawClient.del(...keys);
            }
            resolve();
          });
        });
      }
    } catch {
      // Best-effort invalidation
    }
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
