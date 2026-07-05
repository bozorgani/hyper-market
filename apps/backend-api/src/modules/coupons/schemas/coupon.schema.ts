import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CouponDocument = HydratedDocument<Coupon>;

@Schema({ collection: 'coupons', timestamps: true, versionKey: false })
export class Coupon {
  @Prop({ type: String, required: true, uppercase: true, trim: true, index: true, unique: true })
  code!: string;

  @Prop({ type: Number, required: true, min: 0, max: 100 })
  percent!: number;

  @Prop({ type: Boolean, default: true, index: true })
  active!: boolean;

  @Prop({ type: Number, default: 0, min: 0 })
  minSubtotal!: number;

  @Prop({ type: Number, default: null, min: 0 })
  maxDiscountAmount?: number | null;

  @Prop({ type: Date, default: null, index: true })
  startsAt?: Date | null;

  @Prop({ type: Date, default: null, index: true })
  endsAt?: Date | null;

  @Prop({ type: Number, default: null, min: 1 })
  usageLimit?: number | null;

  @Prop({ type: Number, default: null, min: 1 })
  perUserLimit?: number | null;

  @Prop({ type: Number, default: 0, min: 0 })
  usedCount!: number;

  @Prop({ type: Date, default: null, index: true })
  deletedAt?: Date | null;
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);
CouponSchema.index({ code: 1, deletedAt: 1 });
CouponSchema.index({ active: 1, startsAt: 1, endsAt: 1, deletedAt: 1 });
