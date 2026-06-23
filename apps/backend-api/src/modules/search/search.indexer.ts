import { Injectable } from '@nestjs/common';
import { getEntityId } from '../../shared/utils/entity-id.util';

const { Meilisearch } = require('meilisearch') as {
  Meilisearch: new (options: { host: string; apiKey?: string }) => any;
};
import { CategoriesService } from '../categories/services/categories.service';
import { Product } from '../products/schemas/product.schema';

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
export class SearchIndexer {
  private readonly indexName = 'products';
  private readonly client: any;

  constructor(private readonly categoriesService: CategoriesService) {
    this.client = new Meilisearch({
      host: process.env.MEILI_HOST ?? 'http://localhost:7700',
      apiKey: process.env.MEILI_API_KEY,
    });
  }

  async indexProduct(product: Product): Promise<void> {
    try {
      await this.ensureProductIndex();
      const document = await this.toProductDocument(product);
      await this.client.index(this.indexName).addDocuments([document], { primaryKey: 'id' });
    } catch {
      // Search indexing must not break product writes.
    }
  }

  async removeProduct(productId: string): Promise<void> {
    try {
      await this.ensureProductIndex();
      await this.client.index(this.indexName).deleteDocument(productId);
    } catch {
      // Search indexing must not break product deletes.
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
