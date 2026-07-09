import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReviewHelpfulVoteDocument = ReviewHelpfulVote & Document;

@Schema({ timestamps: true })
export class ReviewHelpfulVote {
  @Prop({ type: Types.ObjectId, ref: 'Review', required: true })
  reviewId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  isHelpful: boolean;
}

export const ReviewHelpfulVoteSchema = SchemaFactory.createForClass(ReviewHelpfulVote);

// Unique per review+user — one vote per user per review
ReviewHelpfulVoteSchema.index({ reviewId: 1, userId: 1 }, { unique: true });
