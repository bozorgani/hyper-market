import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { Order } from '../../orders/schemas/order.schema';
import { User } from '../../users/schemas/user.schema';
import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentStatus } from '../enums/payment-status.enum';

export type PaymentDocument = HydratedDocument<Payment>;

@Schema({
  collection: 'payments',
  timestamps: true,
  versionKey: false,
})
export class Payment {
  @Prop({ type: SchemaTypes.ObjectId, ref: Order.name, required: true, index: true })
  orderId!: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: User.name, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0 })
  amount!: number;

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.PENDING, index: true })
  status!: PaymentStatus;

  @Prop({ type: String, enum: PaymentMethod, default: PaymentMethod.COD })
  method!: PaymentMethod;

  @Prop({ type: String, default: null, index: true })
  transactionId?: string | null;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
PaymentSchema.index({ orderId: 1, userId: 1 });
PaymentSchema.index(
  { orderId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: PaymentStatus.PENDING },
  },
);
PaymentSchema.index(
  { orderId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: PaymentStatus.PAID },
  },
);
PaymentSchema.index({ status: 1, createdAt: -1 });
