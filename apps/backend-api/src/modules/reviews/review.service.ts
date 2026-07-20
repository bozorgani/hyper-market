import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ReviewRepository } from './review.repository';
import { CreateReviewDto, UpdateReviewDto, ReviewQueryDto, ApproveReviewDto } from './review.dto';
import { OrdersService } from '../orders/services/orders.service';
import { OrderStatus } from '../orders/enums/order-status.enum';

@Injectable()
export class ReviewService {
  constructor(
    private readonly reviewRepository: ReviewRepository,
    private readonly ordersService: OrdersService,
  ) {}

  async createReview(userId: string, dto: CreateReviewDto) {
    // Verify order exists and belongs to user
    const order = await this.ordersService.getOrderById(dto.orderId, userId, 'CUSTOMER');
    
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Verify order is delivered
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('Can only review delivered orders');
    }

    // Verify product is in the order
    const productInOrder = order.items.find(
      (item) => item.productId.toString() === dto.productId,
    );

    if (!productInOrder) {
      throw new BadRequestException('Product not found in this order');
    }

    // Check if user already reviewed this product in this order
    const hasReviewed = await this.reviewRepository.hasUserReviewedProduct(
      userId,
      dto.productId,
      dto.orderId,
    );

    if (hasReviewed) {
      throw new BadRequestException('You have already reviewed this product');
    }

    const review = await this.reviewRepository.create({
      ...dto,
      userId,
      isVerifiedPurchase: true,
    });

    return {
      message: 'Review created successfully. It will be visible after approval.',
      review,
    };
  }

  async getProductReviews(productId: string, query: ReviewQueryDto) {
    const { reviews, total } = await this.reviewRepository.findByProductId(
      productId,
      query,
    );

    const page = query.page || 1;
    const limit = query.limit || 10;
    const totalPages = Math.ceil(total / limit);

    // Get rating statistics
    const stats = await this.reviewRepository.getAverageRating(productId);

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
      statistics: stats,
    };
  }

  async getUserReviews(userId: string, page = 1, limit = 10) {
    const { reviews, total } = await this.reviewRepository.findByUserId(
      userId,
      page,
      limit,
    );

    const totalPages = Math.ceil(total / limit);

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  async getPendingReviews(page = 1, limit = 10) {
    const { reviews, total } = await this.reviewRepository.findPendingReviews(
      page,
      limit,
    );

    const totalPages = Math.ceil(total / limit);

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  async updateReview(reviewId: string, userId: string, dto: UpdateReviewDto) {
    const review = await this.reviewRepository.findById(reviewId);

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.userId.toString() !== userId) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    const updated = await this.reviewRepository.update(reviewId, {
      ...dto,
      isApproved: false,
      approvedAt: null,
      approvedBy: null,
    });

    return {
      message: 'Review updated successfully',
      review: updated,
    };
  }

  async deleteReview(reviewId: string, userId: string, userRole: string) {
    const review = await this.reviewRepository.findById(reviewId);

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Users can delete their own reviews, admins can delete any
    if (review.userId.toString() !== userId && userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    await this.reviewRepository.delete(reviewId);

    return { message: 'Review deleted successfully' };
  }

  async approveReview(reviewId: string, adminId: string) {
    const review = await this.reviewRepository.approve(reviewId, adminId);

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return {
      message: 'Review approved successfully',
      review,
    };
  }

  async rejectReview(reviewId: string) {
    const review = await this.reviewRepository.reject(reviewId);

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return {
      message: 'Review rejected',
      review,
    };
  }

  async markReviewHelpful(reviewId: string, userId: string, isHelpful: boolean) {
    // Check if user already voted on this review
    const existingVote = await this.reviewRepository.findHelpfulVote(reviewId, userId);
    if (existingVote) {
      throw new BadRequestException('You have already voted on this review');
    }

    const review = isHelpful
      ? await this.reviewRepository.incrementHelpful(reviewId)
      : await this.reviewRepository.incrementNotHelpful(reviewId);

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Record the vote
    await this.reviewRepository.createHelpfulVote(reviewId, userId, isHelpful);

    return {
      message: isHelpful ? 'Marked as helpful' : 'Marked as not helpful',
      review,
    };
  }

  async getProductRatingStats(productId: string) {
    return this.reviewRepository.getAverageRating(productId);
  }
}
