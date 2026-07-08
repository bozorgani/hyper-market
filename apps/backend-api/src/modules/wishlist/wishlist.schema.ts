import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WishlistDocument = Wishlist & Document;

@Schema({ timestamps: true })
export class Wishlist {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Product' }], default: [] })
  products: Types.ObjectId[];
}

export const WishlistSchema = SchemaFactory.createForClass(Wishlist);

// Index for efficient queries
WishlistSchema.index({ userId: 1 });
WishlistSchema.index({ products: 1 });

// Virtual for product count
WishlistSchema.virtual('productCount').get(function () {
  return this.products?.length || 0;
});

// Ensure virtuals are included in JSON output
WishlistSchema.set('toJSON', { virtuals: true });
WishlistSchema.set('toObject', { virtuals: true });
