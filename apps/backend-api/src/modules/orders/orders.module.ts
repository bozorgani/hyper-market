import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CartModule } from '../cart/cart.module';
import { CouponsModule } from '../coupons/coupons.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { ProductsModule } from '../products/products.module';
import { ShippingModule } from '../shipping/shipping.module';
import { OrdersController } from './controllers/orders.controller';
import { OrdersRepository } from './repositories/orders.repository';
import { Order, OrderSchema } from './schemas/order.schema';
import { OrdersService } from './services/orders.service';

@Module({
  imports: [
    CartModule,
    ProductsModule,
    PermissionsModule,
    CouponsModule,
    ShippingModule,
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
  ],
  controllers: [OrdersController],
  providers: [OrdersRepository, OrdersService],
  exports: [OrdersRepository, OrdersService],
})
export class OrdersModule {}
