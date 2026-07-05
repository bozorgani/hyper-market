import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CartModule } from '../cart/cart.module';
import { AdminCouponsController, CouponsController } from './coupons.controller';
import { CouponRepository } from './repositories/coupon.repository';
import { CouponUsage, CouponUsageSchema } from './schemas/coupon-usage.schema';
import { Coupon, CouponSchema } from './schemas/coupon.schema';
import { CouponsService } from './coupons.service';

@Module({
  imports: [
    CartModule,
    MongooseModule.forFeature([
      { name: Coupon.name, schema: CouponSchema },
      { name: CouponUsage.name, schema: CouponUsageSchema },
    ]),
  ],
  controllers: [CouponsController, AdminCouponsController],
  providers: [CouponRepository, CouponsService],
  exports: [CouponRepository, CouponsService],
})
export class CouponsModule {}
