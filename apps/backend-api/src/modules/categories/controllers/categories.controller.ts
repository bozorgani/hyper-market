import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Permissions } from '../../permissions/decorators/permissions.decorator';
import { UserRole } from '../../users/enums/user-role.enum';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { CategoriesService } from '../services/categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Public()
  listCategories(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (page || limit) {
      return this.categoriesService.listCategoriesPaginated(
        this.toPositiveInteger(page, 1),
        this.toPositiveInteger(limit, 20),
      );
    }
    return this.categoriesService.listCategories();
  }

  @Get(':id')
  @Public()
  getCategoryById(@Param('id') id: string) {
    return this.categoriesService.getPublicCategoryById(id);
  }

  private toPositiveInteger(value: string | undefined, fallback: number): number {
    if (!value) return fallback;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) return fallback;
    return parsed;
  }
}

@Controller('admin/categories')
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class AdminCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Permissions('categories.read')
  listCategoriesForAdmin(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (page || limit) {
      return this.categoriesService.listCategoriesPaginatedForAdmin(
        this.toPositiveInteger(page, 1),
        this.toPositiveInteger(limit, 20),
      );
    }
    return this.categoriesService.listCategoriesForAdmin();
  }

  @Get(':id')
  @Permissions('categories.read')
  getCategoryByIdForAdmin(@Param('id') id: string) {
    return this.categoriesService.getCategoryByIdOrFail(id);
  }

  @Post()
  @Permissions('categories.create')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.createCategory(dto);
  }

  @Put(':id')
  @Permissions('categories.update')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.updateCategory(id, dto);
  }

  @Delete(':id')
  @Permissions('categories.delete')
  deleteCategory(@Param('id') id: string) {
    return this.categoriesService.deleteCategory(id);
  }

  private toPositiveInteger(value: string | undefined, fallback: number): number {
    if (!value) return fallback;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) return fallback;
    return parsed;
  }
}
