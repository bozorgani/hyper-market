import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Permissions } from '../../permissions/decorators/permissions.decorator';
import { UserRole } from '../../users/enums/user-role.enum';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { ProductImageStorageService } from '../services/product-image-storage.service';
import { ProductsService } from '../services/products.service';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly productImageStorageService: ProductImageStorageService,
  ) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions('products.create')
  createProduct(@Body() dto: CreateProductDto) {
    return this.productsService.createProduct(dto);
  }


  @Post('images/upload')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions('products.update')
  @UseInterceptors(FileInterceptor('image'))
  uploadProductImage(
    @UploadedFile()
    file: {
      originalname?: string;
      mimetype?: string;
      size?: number;
      buffer?: Buffer;
    },
  ) {
    return this.productImageStorageService.saveProductImage(file);
  }

  @Get('images/:fileName')
  @Public()
  serveProductImage(
    @Param('fileName') fileName: string,
    @Res() response: Response,
  ) {
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
    @Query('isActive') isActive?: string,
  ) {
    return this.productsService.listProducts(
      this.toPositiveInteger(page, 1),
      this.toPositiveInteger(limit, 20),
      categoryId,
      search?.trim() || undefined,
      this.toOptionalBoolean(isActive),
    );
  }

  @Get(':id')
  @Public()
  getProductById(@Param('id') id: string) {
    return this.productsService.getProductById(id);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions('products.update')
  updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.updateProduct(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions('products.delete')
  deleteProduct(@Param('id') id: string) {
    return this.productsService.deleteProduct(id);
  }

  private toPositiveInteger(value: string | undefined, fallback: number): number {
    if (!value) {
      return fallback;
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
      return fallback;
    }

    return parsed;
  }

  private toOptionalBoolean(value: string | undefined): boolean | undefined {
    if (value === "true") return true;
    if (value === "false") return false;
    return undefined;
  }
}
