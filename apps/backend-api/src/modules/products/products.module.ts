import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CategoriesModule } from '../categories/categories.module';
import { SearchModule } from '../search/search.module';
import { ProductsController } from './controllers/products.controller';
import { ProductsRepository } from './repositories/products.repository';
import { ProductImageStorageService } from './services/product-image-storage.service';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { Product, ProductSchema } from './schemas/product.schema';
import { ProductsService } from './services/products.service';

@Module({
  imports: [
    CategoriesModule,
    SearchModule,
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  controllers: [ProductsController],
  providers: [ProductsRepository, ProductsService, ProductImageStorageService],
  exports: [ProductsRepository, ProductsService, ProductImageStorageService],
})
export class ProductsModule {}
