import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/enums/audit-action.enum';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Permissions } from '../../permissions/decorators/permissions.decorator';
import { UserRole } from '../../users/enums/user-role.enum';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { CategoriesService } from '../services/categories.service';
import { getEntityId } from '../../../shared/utils/entity-id.util';

@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly auditService: AuditService,
  ) {}

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
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @Permissions('categories.read')
  listCategoriesForAdmin(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    if (page || limit || search) {
      return this.categoriesService.listCategoriesPaginatedForAdmin(
        this.toPositiveInteger(page, 1),
        this.toPositiveInteger(limit, 20),
        search,
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
  async createCategory(
    @Body() dto: CreateCategoryDto,
    @CurrentUser() user: JwtPayload,
    @Req() request: Request,
  ) {
    const category = await this.categoriesService.createCategory(dto);
    await this.auditService.log({
      actorUserId: user.sub,
      action: AuditAction.CATEGORY_CREATED,
      resource: 'category',
      resourceId: getEntityId(category),
      metadata: { name: category.name, slug: category.slug },
      request,
    });
    return category;
  }

  @Put(':id')
  @Permissions('categories.update')
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: JwtPayload,
    @Req() request: Request,
  ) {
    const category = await this.categoriesService.updateCategory(id, dto);
    await this.auditService.log({
      actorUserId: user.sub,
      action: AuditAction.CATEGORY_UPDATED,
      resource: 'category',
      resourceId: id,
      metadata: { changedFields: Object.keys(dto) },
      request,
    });
    return category;
  }

  @Delete(':id')
  @Permissions('categories.delete')
  async deleteCategory(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Req() request: Request,
  ) {
    const category = await this.categoriesService.deleteCategory(id);
    await this.auditService.log({
      actorUserId: user.sub,
      action: AuditAction.CATEGORY_DELETED,
      resource: 'category',
      resourceId: id,
      metadata: { name: category.name, slug: category.slug },
      request,
    });
    return category;
  }

  private toPositiveInteger(value: string | undefined, fallback: number): number {
    if (!value) return fallback;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) return fallback;
    return parsed;
  }
}
