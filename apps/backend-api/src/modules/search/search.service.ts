import { Inject, Injectable } from '@nestjs/common';
import { EventBusService } from '../../core/events/event-bus.service';
import { EventType } from '../../core/events/enums/event-type.enum';
import { PaginatedResult } from '../../shared/interfaces/pagination.interface';
import { paginatedResult } from '../../shared/utils/pagination.util';
import { MEILISEARCH_CLIENT } from './meilisearch-client.provider';
import { ProductSearchDocument } from './search.indexer';

export interface MeilisearchServiceIndex {
  search(query: string, options?: Record<string, unknown>): Promise<{
    hits: unknown[];
    facetDistribution?: Record<string, Record<string, number>>;
    [key: string]: unknown;
  }>;
}

export interface MeilisearchServiceClient {
  index(indexUid: string): MeilisearchServiceIndex;
}

export type ProductSearchOptions = {
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  minStock?: number;
  maxStock?: number;
  sort?: string;
  page?: number;
  limit?: number;
};

export type ProductSearchFacets = {
  categories: Record<string, number>;
  brands: Record<string, number>;
  tags: Record<string, number>;
  status?: Record<string, number>;
};

export type ProductSearchResult = PaginatedResult<ProductSearchDocument> & {
  facets: ProductSearchFacets;
};

@Injectable()
export class SearchService {
  private readonly indexName = 'products';
  private readonly client: MeilisearchServiceClient;

  constructor(
    private readonly eventBusService: EventBusService,
    @Inject(MEILISEARCH_CLIENT) client: MeilisearchServiceClient,
  ) {
    this.client = client;
  }

  async searchProducts(
    query: string,
    options: ProductSearchOptions = {},
  ): Promise<ProductSearchResult> {
    const page = this.normalizePage(options.page);
    const limit = this.normalizeLimit(options.limit, 20, 100);
    const filter = this.buildFilters(options, false);
    const result = await this.client.index(this.indexName).search(query, {
      limit,
      offset: this.toOffset(page, limit),
      filter,
      sort: options.sort ? [options.sort] : undefined,
      facets: ['categoryName', 'brand', 'tags'],
      attributesToRetrieve: [
        'id',
        'title',
        'description',
        'price',
        'discountPrice',
        'effectivePrice',
        'stock',
        'categoryName',
        'categoryId',
        'image',
        'brand',
        'tags',
        'createdAt',
      ],
    });

    const hits = result.hits as ProductSearchDocument[];
    const total = this.getTotalHits(result, hits.length);

    this.eventBusService.emit({
      type: EventType.SEARCH_PERFORMED,
      payload: {
        query,
        resultsCount: total,
        filters: {
          categoryId: options.categoryId,
          minPrice: options.minPrice,
          maxPrice: options.maxPrice,
          minStock: options.minStock,
          maxStock: options.maxStock,
          sort: options.sort,
        },
      },
      timestamp: Date.now(),
    });

    return {
      ...paginatedResult(hits, total, page, limit),
      facets: this.normalizeFacets(result.facetDistribution),
    };
  }

  async searchAdminProducts(
    query: string,
    options: ProductSearchOptions = {},
  ): Promise<ProductSearchResult> {
    const page = this.normalizePage(options.page);
    const limit = this.normalizeLimit(options.limit, 50, 100);
    const filter = this.buildFilters(options, true);
    const result = await this.client.index(this.indexName).search(query, {
      limit,
      offset: this.toOffset(page, limit),
      filter,
      sort: options.sort ? [options.sort] : undefined,
      facets: ['categoryName', 'brand', 'tags', 'isActive'],
    });

    const hits = result.hits as ProductSearchDocument[];
    const total = this.getTotalHits(result, hits.length);

    return {
      ...paginatedResult(hits, total, page, limit),
      facets: this.normalizeFacets(result.facetDistribution, true),
    };
  }

  async suggestProducts(query: string) {
    if (!query.trim()) {
      return [];
    }

    const result = await this.client.index(this.indexName).search(query, {
      limit: 8,
      attributesToRetrieve: ['id', 'title', 'image', 'price', 'discountPrice', 'effectivePrice', 'stock', 'categoryName'],
      filter: 'isActive = true',
    });

    return (result.hits as ProductSearchDocument[]).map((hit: ProductSearchDocument) => ({
      id: hit.id,
      title: hit.title,
      image: hit.image,
      price: hit.price,
      discountPrice: hit.discountPrice,
      effectivePrice: hit.effectivePrice,
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
      filters.push(`effectivePrice >= ${options.minPrice}`);
    }

    if (options.maxPrice !== undefined) {
      filters.push(`effectivePrice <= ${options.maxPrice}`);
    }

    if (options.minStock !== undefined) {
      filters.push(`stock >= ${options.minStock}`);
    }

    if (options.maxStock !== undefined) {
      filters.push(`stock <= ${options.maxStock}`);
    }

    return filters;
  }

  private getTotalHits(result: Record<string, unknown>, fallback: number): number {
    return (result.totalHits as number) ?? (result.estimatedTotalHits as number) ?? fallback;
  }

  private normalizeFacets(
    facetDistribution: Record<string, Record<string, number>> | undefined,
    includeStatus = false,
  ): ProductSearchFacets {
    return {
      categories: facetDistribution?.categoryName ?? {},
      brands: facetDistribution?.brand ?? {},
      tags: facetDistribution?.tags ?? {},
      ...(includeStatus ? { status: facetDistribution?.isActive ?? {} } : {}),
    };
  }

  private normalizePage(page: number | undefined): number {
    return Math.max(1, Number.isInteger(page) ? page! : 1);
  }

  private normalizeLimit(limit: number | undefined, fallback: number, max: number): number {
    if (!Number.isInteger(limit)) return fallback;
    return Math.min(Math.max(limit!, 1), max);
  }

  private toOffset(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  private sanitizeFilterValue(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]/g, '');
  }
}
