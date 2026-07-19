import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review, ReviewDocument } from './review.schema';
import { ReviewHelpfulVote, ReviewHelpfulVoteDocument } from './review-helpful-vote.schema';
import { CreateReviewDto, UpdateReviewDto, ReviewQueryDto } from './review.dto';

@Injectable()
export class ReviewRepository {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    @InjectModel(ReviewHelpfulVote.name) private helpfulVoteModel: Model<ReviewHelpfulVoteDocument>,
  ) {}

  async findHelpfulVote(reviewId: string, userId: string): Promise<ReviewHelpfulVote | null> {
    if (!Types.ObjectId.isValid(reviewId) || !Types.ObjectId.isValid(userId)) return null;
    return this.helpfulVoteModel
      .findOne({
        reviewId: new Types.ObjectId(reviewId),
        userId: new Types.ObjectId(userId),
      })
      .lean()
      .exec();
  }

  async createHelpfulVote(reviewId: string, userId: string, isHelpful: boolean): Promise<ReviewHelpfulVote> {
    const vote = new this.helpfulVoteModel({
      reviewId: new Types.ObjectId(reviewId),
      userId: new Types.ObjectId(userId),
      isHelpful,
    });
    return vote.save();
  }

  async create(data: CreateReviewDto & { userId: string; isVerifiedPurchase?: boolean }): Promise<Review> {
    const review = new this.reviewModel({
      ...data,
      productId: new Types.ObjectId(data.productId),
      orderId: new Types.ObjectId(data.orderId),
      userId: new Types.ObjectId(data.userId),
    });
    return review.save();
  }

  async findById(id: string): Promise<Review | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.reviewModel
      .findById(id)
      .populate('userId', 'name email')
      .lean()
      .exec();
  }

  async findByProductId(
    productId: string,
    query: ReviewQueryDto,
  ): Promise<{ reviews: Review[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const filter: any = {
      productId: new Types.ObjectId(productId),
    };

    if (query.isApproved !== undefined) {
      filter.isApproved = query.isApproved;
    } else {
      filter.isApproved = true; // Default to approved reviews
    }

    if (query.rating) {
      filter.rating = query.rating;
    }

    if (query.isVerifiedPurchase !== undefined) {
      filter.isVerifiedPurchase = query.isVerifiedPurchase;
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const [reviews, total] = await Promise.all([
      this.reviewModel
        .find(filter)
        .populate('userId', 'name email')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.reviewModel.countDocuments(filter).exec(),
    ]);

    return { reviews, total };
  }

  async findByUserId(userId: string, page = 1, limit = 10): Promise<{ reviews: Review[]; total: number }> {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.reviewModel
        .find({ userId: new Types.ObjectId(userId) })
        .populate('productId', 'name images price')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.reviewModel.countDocuments({ userId: new Types.ObjectId(userId) }).exec(),
    ]);

    return { reviews, total };
  }

  async findPendingReviews(page = 1, limit = 10): Promise<{ reviews: Review[]; total: number }> {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.reviewModel
        .find({ isApproved: false })
        .populate('userId', 'name email')
        .populate('productId', 'name images')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.reviewModel.countDocuments({ isApproved: false }).exec(),
    ]);

    return { reviews, total };
  }

  async update(id: string, data: Record<string, unknown>): Promise<Review | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.reviewModel
      .findByIdAndUpdate(id, data, { new: true })
      .exec();
  }

  async approve(id: string, approvedBy: string): Promise<Review | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.reviewModel
      .findByIdAndUpdate(
        id,
        {
          isApproved: true,
          approvedAt: new Date(),
          approvedBy: new Types.ObjectId(approvedBy),
        },
        { new: true },
      )
      .exec();
  }

  async reject(id: string): Promise<Review | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.reviewModel
      .findByIdAndUpdate(id, { isApproved: false }, { new: true })
      .exec();
  }

  async delete(id: string): Promise<Review | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.reviewModel.findByIdAndDelete(id).exec();
  }

  async incrementHelpful(id: string): Promise<Review | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.reviewModel
      .findByIdAndUpdate(id, { $inc: { helpfulCount: 1 } }, { new: true })
      .exec();
  }

  async incrementNotHelpful(id: string): Promise<Review | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.reviewModel
      .findByIdAndUpdate(id, { $inc: { notHelpfulCount: 1 } }, { new: true })
      .exec();
  }

  async getAverageRating(productId: string): Promise<{
    averageRating: number;
    totalReviews: number;
    ratingDistribution: Record<number, number>;
  }> {
    return (this.reviewModel as any).getAverageRating(productId);
  }

  async hasUserReviewedProduct(userId: string, productId: string, orderId: string): Promise<boolean> {
    const count = await this.reviewModel.countDocuments({
      userId: new Types.ObjectId(userId),
      productId: new Types.ObjectId(productId),
      orderId: new Types.ObjectId(orderId),
    });
    return count > 0;
  }
}
