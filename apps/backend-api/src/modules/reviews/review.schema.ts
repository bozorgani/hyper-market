import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReviewDocument = Review & Document;

@Schema({ timestamps: true })
export class Review {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  orderId: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ required: true, minlength: 10, maxlength: 1000 })
  comment: string;

  @Prop({ default: null })
  title?: string;

  @Prop({ default: false })
  isVerifiedPurchase: boolean;

  @Prop({ default: false, index: true })
  isApproved: boolean;

  @Prop({ type: Date, default: null })
  approvedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  approvedBy?: Types.ObjectId;

  @Prop({ default: 0 })
  helpfulCount: number;

  @Prop({ default: 0 })
  notHelpfulCount: number;

  @Prop({ type: [String], default: [] })
  images?: string[];

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

// Indexes for efficient queries
ReviewSchema.index({ productId: 1, isApproved: 1, createdAt: -1 });
ReviewSchema.index({ userId: 1, createdAt: -1 });
ReviewSchema.index({ orderId: 1 });
ReviewSchema.index({ rating: 1 });

// Virtual for average rating calculation
ReviewSchema.statics.getAverageRating = async function (productId: string) {
  const result = await this.aggregate([
    { $match: { productId: new Types.ObjectId(productId), isApproved: true } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        ratingDistribution: {
          $push: '$rating',
        },
      },
    },
  ]);

  if (result.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  const { averageRating, totalReviews, ratingDistribution } = result[0];
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  
  ratingDistribution.forEach((rating: number) => {
    distribution[rating as keyof typeof distribution]++;
  });

  return {
    averageRating: Math.round(averageRating * 10) / 10,
    totalReviews,
    ratingDistribution: distribution,
  };
};
