import { Controller, Get, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { SearchService } from './search.service';
import { SearchIndexer } from './search.indexer';

function toNumber(value: string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toPositiveInteger(value: string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('products')
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  searchProducts(
    @Query('q') query = '',
    @Query('categoryId') categoryId?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('minStock') minStock?: string,
    @Query('maxStock') maxStock?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.searchService.searchProducts(query, {
      categoryId,
      minPrice: toNumber(minPrice),
      maxPrice: toNumber(maxPrice),
      minStock: toNumber(minStock),
      maxStock: toNumber(maxStock),
      sort,
      page: toPositiveInteger(page),
      limit: toPositiveInteger(limit),
    });
  }

  @Get('suggest')
  @Public()
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  suggestProducts(@Query('q') query = '') {
    return this.searchService.suggestProducts(query);
  }
}

@Controller('admin/search')
export class AdminSearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly searchIndexer: SearchIndexer,
  ) {}

  @Get('products')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  searchProducts(
    @Query('q') query = '',
    @Query('categoryId') categoryId?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('minStock') minStock?: string,
    @Query('maxStock') maxStock?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.searchService.searchAdminProducts(query, {
      categoryId,
      minPrice: toNumber(minPrice),
      maxPrice: toNumber(maxPrice),
      minStock: toNumber(minStock),
      maxStock: toNumber(maxStock),
      sort,
      page: toPositiveInteger(page),
      limit: toPositiveInteger(limit),
    });
  }

  /**
   * POST /admin/search/reindex — full reindex of all products.
   * Clears the Meilisearch index and rebuilds from MongoDB.
   * Fixes stale/orphan documents and ID mismatches.
   */
  @Post('reindex')
  @Roles(UserRole.SUPER_ADMIN)
  reindexAll() {
    return this.searchIndexer.reindexAll();
  }
}
