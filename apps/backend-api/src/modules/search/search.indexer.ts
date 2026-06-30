import { Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '../../infrastructure/logger/logger.service';
import { getEntityId } from '../../shared/utils/entity-id.util';

const { Meilisearch } = require('meilisearch') as {
  Meilisearch: new (options: { host: string; apiKey?: string }) => any;
};
import { CategoriesService } from '../categories/services/categories.service';
import { Product } from '../products/schemas/product.schema';
import { SearchQueueService } from './search-queue.service';

export type ProductSearchDocument = {
  id: string;
  title: string;
  description: string;
  price: number;
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
  ) {
    this.client = new Meilisearch({
      host: process.env.MEILI_HOST ?? 'http://localhost:7700',
      apiKey: process.env.MEILI_API_KEY,
    });
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

  private async ensureProductIndex(): Promise<void> {
    const index = this.client.index(this.indexName);
    await index.updateSettings({
      searchableAttributes: ['title', 'description', 'categoryName'],
      displayedAttributes: ['id', 'title', 'description', 'price', 'stock', 'categoryName', 'categoryId', 'image', 'isActive', 'createdAt'],
      filterableAttributes: ['categoryId', 'categoryName', 'stock', 'price', 'isActive'],
      sortableAttributes: ['price', 'stock', 'createdAt'],
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
      price: product.discountPrice ?? product.price,
      stock: product.stock,
      categoryName: category?.name ?? '',
      categoryId,
      image: product.images?.[0] ?? null,
      isActive: product.isActive,
      createdAt: productWithTimestamps.createdAt?.toISOString?.() ?? new Date().toISOString(),
    };
  }
}
