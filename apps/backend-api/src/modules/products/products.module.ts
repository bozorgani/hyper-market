import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CategoriesModule } from '../categories/categories.module';
import { SearchModule } from '../search/search.module';
import { AdminProductsController, ProductsController } from './controllers/products.controller';
import { ProductsRepository } from './repositories/products.repository';
import { ProductImageStorageService } from './services/product-image-storage.service';
import { PRODUCT_IMAGE_STORAGE, IProductImageStorage } from './storage/product-image-storage.interface';
import { createProductImageStorage } from './storage/storage.provider';
import { LoggerService } from '../../infrastructure/logger/logger.service';
import { ConfigService } from '@nestjs/config';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { Product, ProductSchema } from './schemas/product.schema';
import { ProductsService } from './services/products.service';
import { ProductImageUploadInterceptor } from './storage/product-image-upload.interceptor';

@Module({
  imports: [
    CategoriesModule,
    SearchModule,
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  controllers: [ProductsController, AdminProductsController],
  providers: [
    ProductsRepository,
    ProductsService,
    // ── Legacy provider (kept for backward compatibility — delegates to IProductImageStorage) ──
    ProductImageStorageService,
    ProductImageUploadInterceptor,
    // ── Pluggable image storage driver ──────────────────────────────────────────────────────
    {
      provide: PRODUCT_IMAGE_STORAGE,
      useFactory: createProductImageStorage,
      inject: [ConfigService, LoggerService],
    },
  ],
  exports: [ProductsRepository, ProductsService, ProductImageStorageService, PRODUCT_IMAGE_STORAGE],
})
export class ProductsModule {}
