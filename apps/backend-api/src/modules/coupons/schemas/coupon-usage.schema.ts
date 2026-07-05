import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { Coupon } from './coupon.schema';
import { User } from '../../users/schemas/user.schema';
import { Order } from '../../orders/schemas/order.schema';

export type CouponUsageDocument = HydratedDocument<CouponUsage>;

@Schema({ collection: 'coupon_usages', timestamps: true, versionKey: false })
export class CouponUsage {
  @Prop({ type: SchemaTypes.ObjectId, ref: Coupon.name, required: true, index: true })
  couponId!: Types.ObjectId;

  @Prop({ type: String, required: true, uppercase: true, trim: true, index: true })
  code!: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: User.name, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: Order.name, required: true, index: true })
  orderId!: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0 })
  discountAmount!: number;
}

export const CouponUsageSchema = SchemaFactory.createForClass(CouponUsage);
CouponUsageSchema.index({ couponId: 1, userId: 1, createdAt: -1 });
CouponUsageSchema.index({ orderId: 1 }, { unique: true });
