import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { Product } from '../../products/schemas/product.schema';
import { User } from '../../users/schemas/user.schema';
import { ShippingMethod } from '../../shipping/enums/shipping-method.enum';
import { OrderStatus } from '../enums/order-status.enum';

export type OrderDocument = HydratedDocument<Order>;

@Schema({ _id: false, versionKey: false })
export class OrderItem {
  @Prop({ type: SchemaTypes.ObjectId, ref: Product.name, required: true })
  productId!: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1 })
  quantity!: number;

  @Prop({ type: Number, required: true, min: 0 })
  priceAtPurchase!: number;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);


@Schema({ _id: false, versionKey: false })
export class DeliveryAddress {
  @Prop({ type: String, required: true, trim: true })
  recipientName!: string;

  @Prop({ type: String, required: true, trim: true })
  phoneNumber!: string;

  @Prop({ type: String, required: true, trim: true })
  province!: string;

  @Prop({ type: String, required: true, trim: true })
  city!: string;

  @Prop({ type: String, required: true, trim: true })
  addressLine!: string;

  @Prop({ type: String, default: null, trim: true })
  plate?: string | null;

  @Prop({ type: String, default: null, trim: true })
  unit?: string | null;

  @Prop({ type: String, default: null, trim: true })
  postalCode?: string | null;
}

export const DeliveryAddressSchema = SchemaFactory.createForClass(DeliveryAddress);

@Schema({ _id: false, versionKey: false })
export class DeliveryWindow {
  @Prop({ type: Date, required: true })
  date!: Date;

  @Prop({ type: String, required: true, trim: true })
  timeSlot!: string;
}

export const DeliveryWindowSchema = SchemaFactory.createForClass(DeliveryWindow);

@Schema({
  collection: 'orders',
  timestamps: true,
  versionKey: false,
})
export class Order {
  @Prop({ type: SchemaTypes.ObjectId, ref: User.name, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: [OrderItemSchema], required: true })
  items!: OrderItem[];

  @Prop({ type: Number, required: true, min: 0 })
  subtotalPrice!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  discountAmount!: number;

  @Prop({ type: String, default: null, trim: true })
  couponCode?: string | null;

  @Prop({ type: String, enum: ShippingMethod, default: ShippingMethod.STANDARD })
  shippingMethod!: ShippingMethod;

  @Prop({ type: Number, default: 0, min: 0 })
  deliveryFee!: number;

  @Prop({ type: Boolean, default: false })
  freeShippingApplied!: boolean;

  @Prop({ type: Number, required: true, min: 0 })
  totalPrice!: number;

  @Prop({
    type: String,
    enum: OrderStatus,
    default: OrderStatus.PENDING,
    index: true,
  })
  status!: OrderStatus;

  @Prop({ type: DeliveryAddressSchema, required: true })
  deliveryAddress!: DeliveryAddress;

  @Prop({ type: DeliveryWindowSchema, required: true })
  deliveryWindow!: DeliveryWindow;

  @Prop({ type: Date, default: null })
  cancelledAt?: Date | null;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
