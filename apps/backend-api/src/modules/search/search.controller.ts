import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { SearchService } from './search.service';

function toNumber(value: string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('products')
  @Public()
  searchProducts(
    @Query('q') query = '',
    @Query('categoryId') categoryId?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('minStock') minStock?: string,
    @Query('maxStock') maxStock?: string,
    @Query('sort') sort?: string,
  ) {
    return this.searchService.searchProducts(query, {
      categoryId,
      minPrice: toNumber(minPrice),
      maxPrice: toNumber(maxPrice),
      minStock: toNumber(minStock),
      maxStock: toNumber(maxStock),
      sort,
    });
  }

  @Get('suggest')
  @Public()
  suggestProducts(@Query('q') query = '') {
    return this.searchService.suggestProducts(query);
  }
}

@Controller('admin/search')
export class AdminSearchController {
  constructor(private readonly searchService: SearchService) {}

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
  ) {
    return this.searchService.searchAdminProducts(query, {
      categoryId,
      minPrice: toNumber(minPrice),
      maxPrice: toNumber(maxPrice),
      minStock: toNumber(minStock),
      maxStock: toNumber(maxStock),
      sort,
    });
  }
}
