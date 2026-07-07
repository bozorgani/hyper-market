import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Permissions } from '../../permissions/decorators/permissions.decorator';
import { UserRole } from '../../users/enums/user-role.enum';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/enums/audit-action.enum';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { getEntityId } from '../../../shared/utils/entity-id.util';
import { parsePaginationParams } from '../../../shared/utils/pagination.util';
import { ProductImageStorageService } from '../services/product-image-storage.service';
import { ProductsService } from '../services/products.service';
import { ProductImageUploadInterceptor } from '../storage/product-image-upload.interceptor';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly productImageStorageService: ProductImageStorageService,
    private readonly auditService: AuditService,
  ) {}

  @Get('images/:fileName')
  @Public()
  serveProductImage(
    @Param('fileName') fileName: string,
    @Res() response: Response,
  ) {
    // Product images are intentionally embeddable by the web app, admin panel,
    // and external object-storage/CDN frontends. Helmet's default CORP value is
    // same-origin, which blocks localhost:3000 from rendering localhost:3001
    // images even when the response is 200 OK.
    response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    if (this.productImageStorageService.supportsLocalFileServing) {
      // Local storage: serve file from disk
      return response.sendFile(this.productImageStorageService.getImagePath(fileName));
    }

    // Remote storage (S3, etc.): redirect to the public URL
    const url = this.productImageStorageService.getImageUrl(fileName);
    return response.redirect(url);
  }

  @Get()
  @Public()
  listProducts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
  ) {
    const { page: safePage, limit: safeLimit } = parsePaginationParams(page, limit);
    
    return this.productsService.listProducts(
      safePage,
      safeLimit,
      categoryId,
      search?.trim() || undefined,
      true,
    );
  }

  @Get(':id')
  @Public()
  getProductById(@Param('id') id: string) {
    return this.productsService.getPublicProductById(id);
  }
}

@Controller('admin/products')
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class AdminProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly productImageStorageService: ProductImageStorageService,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  @Permissions('products.create')
  async createProduct(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: JwtPayload,
    @Req() request: Request,
  ) {
    const product = await this.productsService.createProduct(dto);
    await this.auditService.log({
      actorUserId: user.sub,
      action: AuditAction.PRODUCT_CREATED,
      resource: 'product',
      resourceId: getEntityId(product),
      metadata: { name: product.name, categoryId: getEntityId(product.categoryId) },
      request,
    });
    return product;
  }

  @Post('images/upload')
  @Permissions('products.update')
  @UseInterceptors(ProductImageUploadInterceptor)
  async uploadProductImage(
    @UploadedFile()
    file: {
      originalname?: string;
      mimetype?: string;
      size?: number;
      buffer?: Buffer;
    },
    @CurrentUser() user: JwtPayload,
    @Req() request: Request,
  ) {
    const image = await this.productImageStorageService.saveProductImage(file);
    await this.auditService.log({
      actorUserId: user.sub,
      action: AuditAction.PRODUCT_IMAGE_UPLOADED,
      resource: 'product-image',
      resourceId: image.fileName,
      metadata: { size: image.size, mimeType: image.mimeType },
      request,
    });
    return image;
  }

  @Get()
  @Permissions('products.read')
  listProductsForAdmin(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    const { page: safePage, limit: safeLimit } = parsePaginationParams(page, limit);
    
    return this.productsService.listProducts(
      safePage,
      safeLimit,
      categoryId,
      search?.trim() || undefined,
      this.toOptionalBoolean(isActive),
    );
  }

  @Get(':id')
  @Permissions('products.read')
  getProductByIdForAdmin(@Param('id') id: string) {
    return this.productsService.getProductById(id);
  }

  @Put(':id')
  @Permissions('products.update')
  async updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: JwtPayload,
    @Req() request: Request,
  ) {
    const product = await this.productsService.updateProduct(id, dto);
    await this.auditService.log({
      actorUserId: user.sub,
      action: AuditAction.PRODUCT_UPDATED,
      resource: 'product',
      resourceId: id,
      metadata: { changedFields: Object.keys(dto) },
      request,
    });
    return product;
  }

  @Delete(':id')
  @Permissions('products.delete')
  async deleteProduct(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Req() request: Request,
  ) {
    const product = await this.productsService.deleteProduct(id);
    await this.auditService.log({
      actorUserId: user.sub,
      action: AuditAction.PRODUCT_DELETED,
      resource: 'product',
      resourceId: id,
      metadata: { name: product.name },
      request,
    });
    return product;
  }

  private toOptionalBoolean(value: string | undefined): boolean | undefined {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  }
}
