import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CategoriesModule } from '../categories/categories.module';
import { SearchModule } from '../search/search.module';
import { ProductsController } from './controllers/products.controller';
import { ProductsRepository } from './repositories/products.repository';
import { Product, ProductSchema } from './schemas/product.schema';
import { ProductsService } from './services/products.service';

@Module({
  imports: [
    CategoriesModule,
    SearchModule,
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
  ],
  controllers: [ProductsController],
  providers: [ProductsRepository, ProductsService],
  exports: [ProductsRepository, ProductsService],
})
export class ProductsModule {}
