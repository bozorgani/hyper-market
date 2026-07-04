import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LoggerService } from '../../infrastructure/logger/logger.service';
import { getEntityId } from '../../shared/utils/entity-id.util';
import { MEILISEARCH_CLIENT } from './meilisearch-client.provider';
import { CategoriesService } from '../categories/services/categories.service';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { SearchQueueService } from './search-queue.service';

export type ProductSearchDocument = {
  id: string;
  title: string;
  description: string;
  price: number;
  discountPrice: number | null;
  effectivePrice: number;
  stock: number;
  categoryName: string;
  categoryId: string;
  image: string | null;
  isActive: boolean;
  createdAt: string;
};

type ProductWithTimestamps = Product & {
  createdAt?: Date;
};

@Injectable()
export class SearchIndexer implements OnModuleInit {
  private readonly indexName = 'products';
  private readonly client: any;

  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly searchQueueService: SearchQueueService,
    private readonly loggerService: LoggerService,
    @Inject(MEILISEARCH_CLIENT) client: any,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
  ) {
    this.client = client;
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureProductIndex();
    } catch (error) {
      this.loggerService.error('Search index settings initialization failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async indexProduct(product: Product): Promise<void> {
    try {
      const document = await this.toProductDocument(product);
      await this.client.index(this.indexName).addDocuments([document], { primaryKey: 'id' });
    } catch (error) {
      this.loggerService.warn('Direct search indexing failed; enqueueing retry job', {
        productId: getEntityId(product),
        error: error instanceof Error ? error.message : String(error),
      });

      const document = await this.toProductDocument(product);
      await this.searchQueueService.enqueueIndexProduct(document);
    }
  }

  async removeProduct(productId: string): Promise<void> {
    try {
      await this.client.index(this.indexName).deleteDocument(productId);
    } catch (error) {
      this.loggerService.warn('Direct search delete failed; enqueueing retry job', {
        productId,
        error: error instanceof Error ? error.message : String(error),
      });

      await this.searchQueueService.enqueueDeleteProduct(productId);
    }
  }

  /**
   * Reindex all active products from MongoDB into Meilisearch.
   * Clears the existing index first to remove stale/orphan documents,
   * then rebuilds from the authoritative data source (MongoDB).
   *
   * Call via: POST /admin/search/reindex
   */
  async reindexAll(): Promise<{ reindexed: number }> {
    this.loggerService.info('[Search] Starting full reindex of all products...');

    // Delete and recreate the index to ensure clean state (fixes stale IDs)
    try {
      await this.client.deleteIndex(this.indexName);
      this.loggerService.info('[Search] Deleted existing Meilisearch index');
    } catch {
      // Index might not exist yet — that's fine
    }

    // Recreate index with correct settings and primaryKey
    await this.ensureProductIndex();

    // Batch-index all active (non-deleted) products from MongoDB
    const products = await this.productModel
      .find({ deletedAt: null })
      .lean()
      .exec();

    if (products.length === 0) {
      this.loggerService.info('[Search] No products to reindex');
      return { reindexed: 0 };
    }

    // Build documents in batches of 100
    const batchSize = 100;
    let totalIndexed = 0;

    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      const documents = await Promise.all(
        batch.map((product) => this.toProductDocument(product)),
      );

      try {
        await this.client.index(this.indexName).addDocuments(documents, { primaryKey: 'id' });
        totalIndexed += documents.length;
      } catch (error) {
        this.loggerService.error('[Search] Batch reindex failed', {
          batchStart: i,
          batchSize: documents.length,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.loggerService.info(`[Search] Full reindex complete: ${totalIndexed} products indexed`);
    return { reindexed: totalIndexed };
  }

  private async ensureProductIndex(): Promise<void> {
    const index = this.client.index(this.indexName);

    // Update settings — this also ensures the primaryKey is set correctly
    await index.updateSettings({
      primaryKey: 'id',
      searchableAttributes: ['title', 'description', 'categoryName'],
      displayedAttributes: ['id', 'title', 'description', 'price', 'discountPrice', 'effectivePrice', 'stock', 'categoryName', 'categoryId', 'image', 'isActive', 'createdAt'],
      filterableAttributes: ['categoryId', 'categoryName', 'stock', 'price', 'discountPrice', 'effectivePrice', 'isActive'],
      sortableAttributes: ['price', 'discountPrice', 'effectivePrice', 'stock', 'createdAt'],
      typoTolerance: {
        enabled: true,
      },
    });
  }

  private async toProductDocument(product: Product): Promise<ProductSearchDocument> {
    const categoryId = getEntityId(product.categoryId);
    const category = await this.categoriesService.getCategoryById(categoryId);
    const productWithTimestamps = product as ProductWithTimestamps;

    return {
      id: getEntityId(product),
      title: product.name,
      description: product.description,
      price: product.price,
      discountPrice: product.discountPrice ?? null,
      effectivePrice: product.discountPrice ?? product.price,
      stock: product.stock,
      categoryName: category?.name ?? '',
      categoryId,
      image: product.images?.[0] ?? null,
      isActive: product.isActive,
      createdAt: productWithTimestamps.createdAt?.toISOString?.() ?? new Date().toISOString(),
    };
  }
}
