import { Injectable } from '@nestjs/common';
import { ProductSearchDocument } from './search.indexer';

const { Meilisearch } = require('meilisearch') as {
  Meilisearch: new (options: { host: string; apiKey?: string }) => any;
};

export type ProductSearchOptions = {
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  minStock?: number;
  maxStock?: number;
  sort?: string;
  limit?: number;
  offset?: number;
};

@Injectable()
export class SearchService {
  private readonly indexName = 'products';
  private readonly client: any;

  constructor() {
    this.client = new Meilisearch({
      host: process.env.MEILI_HOST ?? 'http://localhost:7700',
      apiKey: process.env.MEILI_API_KEY,
    });
  }

  async searchProducts(query: string, options: ProductSearchOptions = {}) {
    const filter = this.buildFilters(options, false);
    const result = await this.client.index(this.indexName).search(query, {
      limit: options.limit ?? 20,
      offset: options.offset ?? 0,
      filter,
      sort: options.sort ? [options.sort] : undefined,
      attributesToRetrieve: ['id', 'title', 'price', 'stock', 'categoryName', 'image'],
    });

    return result.hits as ProductSearchDocument[];
  }

  async searchAdminProducts(query: string, options: ProductSearchOptions = {}) {
    const filter = this.buildFilters(options, true);
    const result = await this.client.index(this.indexName).search(query, {
      limit: options.limit ?? 50,
      offset: options.offset ?? 0,
      filter,
      sort: options.sort ? [options.sort] : undefined,
    });

    return result.hits as ProductSearchDocument[];
  }

  async suggestProducts(query: string) {
    if (!query.trim()) {
      return [];
    }

    const result = await this.client.index(this.indexName).search(query, {
      limit: 8,
      attributesToRetrieve: ['id', 'title', 'image', 'price', 'stock', 'categoryName'],
      filter: 'isActive = true',
    });

    return (result.hits as ProductSearchDocument[]).map((hit: ProductSearchDocument) => ({
      id: hit.id,
      title: hit.title,
      image: hit.image,
      price: hit.price,
      stock: hit.stock,
      categoryName: hit.categoryName,
    }));
  }

  private buildFilters(
    options: ProductSearchOptions,
    includeInactive: boolean,
  ): (string | string[])[] {
    const filters: (string | string[])[] = [];

    if (!includeInactive) {
      filters.push('isActive = true');
    }

    if (options.categoryId) {
      const categoryId = this.sanitizeFilterValue(options.categoryId);
      if (categoryId) {
        filters.push(`categoryId = "${categoryId}"`);
      }
    }

    if (options.minPrice !== undefined) {
      filters.push(`price >= ${options.minPrice}`);
    }

    if (options.maxPrice !== undefined) {
      filters.push(`price <= ${options.maxPrice}`);
    }

    if (options.minStock !== undefined) {
      filters.push(`stock >= ${options.minStock}`);
    }

    if (options.maxStock !== undefined) {
      filters.push(`stock <= ${options.maxStock}`);
    }

    return filters;
  }

  private sanitizeFilterValue(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]/g, '');
  }
}
