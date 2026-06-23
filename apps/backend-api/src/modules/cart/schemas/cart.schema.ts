import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { Product } from '../../products/schemas/product.schema';
import { User } from '../../users/schemas/user.schema';

export type CartDocument = HydratedDocument<Cart>;

@Schema({ _id: false, versionKey: false })
export class CartItem {
  @Prop({ type: SchemaTypes.ObjectId, ref: Product.name, required: true })
  productId!: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1 })
  quantity!: number;
}

export const CartItemSchema = SchemaFactory.createForClass(CartItem);

@Schema({
  collection: 'carts',
  timestamps: true,
  versionKey: false,
})
export class Cart {
  @Prop({ type: SchemaTypes.ObjectId, ref: User.name, required: true })
  userId!: Types.ObjectId;

  @Prop({ type: [CartItemSchema], default: [] })
  items!: CartItem[];
}

export const CartSchema = SchemaFactory.createForClass(Cart);
CartSchema.index({ userId: 1 }, { unique: true });
