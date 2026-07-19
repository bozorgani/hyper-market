import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ReviewService } from './review.service';
import { ReviewRepository } from './review.repository';
import { OrdersService } from '../orders/services/orders.service';
import { OrderStatus } from '../orders/enums/order-status.enum';

const REVIEW_ID = '507f1f77bcf86cd799439021';
const PRODUCT_ID = '507f1f77bcf86cd799439011';
const USER_ID = 'user-1';
const ORDER_ID = '507f1f77bcf86cd799439012';
const ADMIN_ID = 'admin-1';

describe('ReviewService', () => {
  let service: ReviewService;
  let reviewRepository: {
    create: jest.Mock;
    findById: jest.Mock;
    findByProductId: jest.Mock;
    findByUserId: jest.Mock;
    findPendingReviews: jest.Mock;
    update: jest.Mock;
    approve: jest.Mock;
    reject: jest.Mock;
    delete: jest.Mock;
    incrementHelpful: jest.Mock;
    incrementNotHelpful: jest.Mock;
    findHelpfulVote: jest.Mock;
    createHelpfulVote: jest.Mock;
    hasUserReviewedProduct: jest.Mock;
    getAverageRating: jest.Mock;
  };
  let ordersService: {
    getOrderById: jest.Mock;
  };

  const mockReview = {
    _id: REVIEW_ID,
    productId: PRODUCT_ID,
    userId: USER_ID,
    orderId: ORDER_ID,
    rating: 5,
    comment: 'Excellent product, highly recommended.',
    title: 'Great purchase',
    isVerifiedPurchase: true,
    isApproved: false,
    approvedAt: null,
    approvedBy: null,
    helpfulCount: 0,
    notHelpfulCount: 0,
    images: [],
  };

  const mockDeliveredOrder = {
    _id: ORDER_ID,
    userId: USER_ID,
    status: OrderStatus.DELIVERED,
    items: [{ productId: PRODUCT_ID, quantity: 1 }],
  };

  beforeEach(async () => {
    reviewRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByProductId: jest.fn(),
      findByUserId: jest.fn(),
      findPendingReviews: jest.fn(),
      update: jest.fn(),
      approve: jest.fn(),
      reject: jest.fn(),
      delete: jest.fn(),
      incrementHelpful: jest.fn(),
      incrementNotHelpful: jest.fn(),
      findHelpfulVote: jest.fn(),
      createHelpfulVote: jest.fn(),
      hasUserReviewedProduct: jest.fn(),
      getAverageRating: jest.fn(),
    };

    ordersService = {
      getOrderById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        { provide: ReviewRepository, useValue: reviewRepository },
        { provide: OrdersService, useValue: ordersService },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── createReview ──────────────────────────────────────────────────
  describe('createReview', () => {
    it('should create a review successfully', async () => {
      ordersService.getOrderById.mockResolvedValue(mockDeliveredOrder);
      reviewRepository.hasUserReviewedProduct.mockResolvedValue(false);
      reviewRepository.create.mockResolvedValue(mockReview);

      const result = await service.createReview(USER_ID, {
        productId: PRODUCT_ID,
        orderId: ORDER_ID,
        rating: 5,
        comment: 'Excellent product, highly recommended.',
        title: 'Great purchase',
      });

      expect(ordersService.getOrderById).toHaveBeenCalledWith(ORDER_ID, USER_ID, 'CUSTOMER');
      expect(reviewRepository.hasUserReviewedProduct).toHaveBeenCalledWith(
        USER_ID,
        PRODUCT_ID,
        ORDER_ID,
      );
      expect(reviewRepository.create).toHaveBeenCalledWith({
        productId: PRODUCT_ID,
        orderId: ORDER_ID,
        rating: 5,
        comment: 'Excellent product, highly recommended.',
        title: 'Great purchase',
        userId: USER_ID,
        isVerifiedPurchase: true,
      });
      expect(result.message).toContain('Review created successfully');
      expect(result.review).toBe(mockReview);
    });

    it('should create a review with images array when provided', async () => {
      ordersService.getOrderById.mockResolvedValue(mockDeliveredOrder);
      reviewRepository.hasUserReviewedProduct.mockResolvedValue(false);
      const reviewWithImages = { ...mockReview, images: ['url1', 'url2'] };
      reviewRepository.create.mockResolvedValue(reviewWithImages);

      const result = await service.createReview(USER_ID, {
        productId: PRODUCT_ID,
        orderId: ORDER_ID,
        rating: 4,
        comment: 'Good but not perfect.',
        images: ['url1', 'url2'],
      });

      expect(reviewRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          images: ['url1', 'url2'],
        }),
      );
      expect(result.review.images).toEqual(['url1', 'url2']);
    });

    it('should reject duplicate reviews if business rules prevent duplicates', async () => {
      ordersService.getOrderById.mockResolvedValue(mockDeliveredOrder);
      reviewRepository.hasUserReviewedProduct.mockResolvedValue(true);

      await expect(
        service.createReview(USER_ID, {
          productId: PRODUCT_ID,
          orderId: ORDER_ID,
          rating: 5,
          comment: 'Excellent.',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate required review data and throw when order is not delivered', async () => {
      ordersService.getOrderById.mockResolvedValue({
        ...mockDeliveredOrder,
        status: OrderStatus.PROCESSING,
      });

      await expect(
        service.createReview(USER_ID, {
          productId: PRODUCT_ID,
          orderId: ORDER_ID,
          rating: 5,
          comment: 'Excellent.',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(ordersService.getOrderById).toHaveBeenCalled();
    });

    it('should throw NotFoundException when order is not found', async () => {
      ordersService.getOrderById.mockResolvedValue(null);

      await expect(
        service.createReview(USER_ID, {
          productId: PRODUCT_ID,
          orderId: ORDER_ID,
          rating: 5,
          comment: 'Excellent.',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when product is not in the order', async () => {
      ordersService.getOrderById.mockResolvedValue({
        ...mockDeliveredOrder,
        items: [{ productId: 'other-product', quantity: 1 }],
      });

      await expect(
        service.createReview(USER_ID, {
          productId: PRODUCT_ID,
          orderId: ORDER_ID,
          rating: 5,
          comment: 'Excellent.',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── approveReview ─────────────────────────────────────────────────
  describe('approveReview', () => {
    it('should approve a pending review', async () => {
      reviewRepository.approve.mockResolvedValue({
        ...mockReview,
        isApproved: true,
        approvedAt: new Date(),
        approvedBy: ADMIN_ID,
      });

      const result = await service.approveReview(REVIEW_ID, ADMIN_ID);

      expect(reviewRepository.approve).toHaveBeenCalledWith(REVIEW_ID, ADMIN_ID);
      expect(result.review.isApproved).toBe(true);
      expect(result.message).toContain('approved');
    });

    it('should throw NotFoundException when review does not exist', async () => {
      reviewRepository.approve.mockResolvedValue(null);

      await expect(
        service.approveReview('invalid-id', ADMIN_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle already approved/rejected reviews correctly', async () => {
      const alreadyApproved = {
        ...mockReview,
        isApproved: true,
        approvedAt: new Date('2024-01-01'),
        approvedBy: ADMIN_ID,
      };
      reviewRepository.approve.mockResolvedValue(alreadyApproved);

      const result = await service.approveReview(REVIEW_ID, ADMIN_ID);
      expect(result.review).toBe(alreadyApproved);
    });
  });

  // ── rejectReview ───────────────────────────────────────────────────
  describe('rejectReview', () => {
    it('should reject a review', async () => {
      reviewRepository.reject.mockResolvedValue({ ...mockReview, isApproved: false });

      const result = await service.rejectReview(REVIEW_ID);

      expect(reviewRepository.reject).toHaveBeenCalledWith(REVIEW_ID);
      expect(result.message).toContain('rejected');
    });

    it('should throw NotFoundException when review not found', async () => {
      reviewRepository.reject.mockResolvedValue(null);

      await expect(service.rejectReview('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ── updateReview ───────────────────────────────────────────────────
  describe('updateReview', () => {
    it('should update a review successfully', async () => {
      reviewRepository.findById.mockResolvedValue(mockReview);
      reviewRepository.update.mockResolvedValue({ ...mockReview, comment: 'Updated.' });

      const result = await service.updateReview(REVIEW_ID, USER_ID, {
        comment: 'Updated.',
      });

      expect(reviewRepository.findById).toHaveBeenCalledWith(REVIEW_ID);
      expect(reviewRepository.update).toHaveBeenCalledWith(REVIEW_ID, {
        comment: 'Updated.',
        isApproved: false,
        approvedAt: null,
        approvedBy: null,
      });
      expect((result.review as any).comment).toBe('Updated.');
    });

    it('should throw NotFoundException when review not found', async () => {
      reviewRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateReview('invalid-id', USER_ID, { comment: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for another user review', async () => {
      reviewRepository.findById.mockResolvedValue({ ...mockReview, userId: 'other-user' });

      await expect(
        service.updateReview(REVIEW_ID, USER_ID, { comment: 'X' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── deleteReview ───────────────────────────────────────────────────
  describe('deleteReview', () => {
    it('should delete a review by its owner', async () => {
      reviewRepository.findById.mockResolvedValue(mockReview);
      reviewRepository.delete.mockResolvedValue(mockReview);

      const result = await service.deleteReview(REVIEW_ID, USER_ID, 'CUSTOMER');

      expect(reviewRepository.delete).toHaveBeenCalledWith(REVIEW_ID);
      expect(result.message).toContain('deleted');
    });

    it('should allow admin to delete any review', async () => {
      reviewRepository.findById.mockResolvedValue({ ...mockReview, userId: 'other-user' });
      reviewRepository.delete.mockResolvedValue(mockReview);

      await service.deleteReview(REVIEW_ID, 'admin-user', 'ADMIN');

      expect(reviewRepository.delete).toHaveBeenCalledWith(REVIEW_ID);
    });

    it('should allow super admin to delete any review', async () => {
      reviewRepository.findById.mockResolvedValue({ ...mockReview, userId: 'other-user' });
      reviewRepository.delete.mockResolvedValue(mockReview);

      await service.deleteReview(REVIEW_ID, 'super-user', 'SUPER_ADMIN');

      expect(reviewRepository.delete).toHaveBeenCalledWith(REVIEW_ID);
    });

    it('should throw ForbiddenException when non-admin tries to delete another user review', async () => {
      reviewRepository.findById.mockResolvedValue({ ...mockReview, userId: 'other-user' });

      await expect(
        service.deleteReview(REVIEW_ID, USER_ID, 'CUSTOMER'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when review not found', async () => {
      reviewRepository.findById.mockResolvedValue(null);

      await expect(
        service.deleteReview('invalid-id', USER_ID, 'CUSTOMER'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── getProductReviews ─────────────────────────────────────────────
  describe('getProductReviews', () => {
    it('should return reviews with pagination and statistics', async () => {
      reviewRepository.findByProductId.mockResolvedValue({
        reviews: [mockReview],
        total: 1,
      });
      reviewRepository.getAverageRating.mockResolvedValue({
        averageRating: 4.5,
        totalReviews: 1,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 },
      });

      const result = await service.getProductReviews(PRODUCT_ID, { page: 1, limit: 10 });

      expect(reviewRepository.findByProductId).toHaveBeenCalledWith(PRODUCT_ID, { page: 1, limit: 10 });
      expect(result.reviews).toHaveLength(1);
      expect(result.statistics.averageRating).toBe(4.5);
    });

    it('should handle products without reviews', async () => {
      reviewRepository.findByProductId.mockResolvedValue({
        reviews: [],
        total: 0,
      });
      reviewRepository.getAverageRating.mockResolvedValue({
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      });

      const result = await service.getProductReviews(PRODUCT_ID, { page: 1, limit: 10 });

      expect(result.reviews).toHaveLength(0);
      expect(result.statistics.totalReviews).toBe(0);
    });
  });

  // ── getUserReviews ─────────────────────────────────────────────────
  describe('getUserReviews', () => {
    it('should return user reviews with pagination', async () => {
      reviewRepository.findByUserId.mockResolvedValue({
        reviews: [mockReview],
        total: 1,
      });

      const result = await service.getUserReviews(USER_ID, 1, 10);

      expect(reviewRepository.findByUserId).toHaveBeenCalledWith(USER_ID, 1, 10);
      expect(result.reviews).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  // ── getPendingReviews ─────────────────────────────────────────────
  describe('getPendingReviews', () => {
    it('should return pending reviews', async () => {
      reviewRepository.findPendingReviews.mockResolvedValue({
        reviews: [mockReview],
        total: 1,
      });

      const result = await service.getPendingReviews(1, 10);

      expect(reviewRepository.findPendingReviews).toHaveBeenCalledWith(1, 10);
      expect(result.reviews[0].isApproved).toBe(false);
    });
  });

  // ── markReviewHelpful ─────────────────────────────────────────────
  describe('markReviewHelpful', () => {
    it('should add helpful vote successfully', async () => {
      reviewRepository.findHelpfulVote.mockResolvedValue(null);
      reviewRepository.incrementHelpful.mockResolvedValue({ ...mockReview, helpfulCount: 1 });
      reviewRepository.createHelpfulVote.mockResolvedValue({ reviewId: REVIEW_ID, userId: USER_ID, isHelpful: true });

      const result = await service.markReviewHelpful(REVIEW_ID, USER_ID, true);

      expect(reviewRepository.findHelpfulVote).toHaveBeenCalledWith(REVIEW_ID, USER_ID);
      expect(reviewRepository.incrementHelpful).toHaveBeenCalledWith(REVIEW_ID);
      expect(reviewRepository.createHelpfulVote).toHaveBeenCalledWith(REVIEW_ID, USER_ID, true);
      expect(result.review.helpfulCount).toBe(1);
      expect(result.message).toContain('Marked as helpful');
    });

    it('should prevent duplicate helpful votes', async () => {
      reviewRepository.findHelpfulVote.mockResolvedValue({ reviewId: REVIEW_ID, userId: USER_ID, isHelpful: true });

      await expect(
        service.markReviewHelpful(REVIEW_ID, USER_ID, true),
      ).rejects.toThrow(BadRequestException);
    });

    it('should increment not helpful count', async () => {
      reviewRepository.findHelpfulVote.mockResolvedValue(null);
      reviewRepository.incrementNotHelpful.mockResolvedValue({ ...mockReview, notHelpfulCount: 1 });
      reviewRepository.createHelpfulVote.mockResolvedValue({ reviewId: REVIEW_ID, userId: USER_ID, isHelpful: false });

      const result = await service.markReviewHelpful(REVIEW_ID, USER_ID, false);

      expect(reviewRepository.incrementNotHelpful).toHaveBeenCalledWith(REVIEW_ID);
      expect(result.message).toContain('Marked as not helpful');
    });

    it('should throw NotFoundException when review not found', async () => {
      reviewRepository.findHelpfulVote.mockResolvedValue(null);
      reviewRepository.incrementHelpful.mockResolvedValue(null);

      await expect(
        service.markReviewHelpful('invalid-id', USER_ID, true),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── getProductRatingStats ─────────────────────────────────────────
  describe('getProductRatingStats', () => {
    it('should calculate review statistics correctly', async () => {
      reviewRepository.getAverageRating.mockResolvedValue({
        averageRating: 4.2,
        totalReviews: 5,
        ratingDistribution: { 1: 0, 2: 0, 3: 1, 4: 2, 5: 2 },
      });

      const result = await service.getProductRatingStats(PRODUCT_ID);

      expect(reviewRepository.getAverageRating).toHaveBeenCalledWith(PRODUCT_ID);
      expect(result.averageRating).toBe(4.2);
      expect(result.totalReviews).toBe(5);
    });

    it('should handle products without reviews', async () => {
      reviewRepository.getAverageRating.mockResolvedValue({
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      });

      const result = await service.getProductRatingStats(PRODUCT_ID);

      expect(result.totalReviews).toBe(0);
      expect(result.averageRating).toBe(0);
    });
  });

  // ── Error cases ────────────────────────────────────────────────────
  describe('error cases', () => {
    it('should throw expected exceptions for missing cases', async () => {
      reviewRepository.findById.mockResolvedValue(null);

      await expect(service.updateReview('bad-id', USER_ID, { comment: 'x' })).rejects.toThrow(NotFoundException);
      await expect(service.deleteReview('bad-id', USER_ID, 'ADMIN')).rejects.toThrow(NotFoundException);
      await expect(service.approveReview('bad-id', ADMIN_ID)).rejects.toThrow(NotFoundException);
      await expect(service.rejectReview('bad-id')).rejects.toThrow(NotFoundException);
    });

    it('should handle missing review/product/user cases', async () => {
      ordersService.getOrderById.mockResolvedValue(null);
      await expect(service.createReview(USER_ID, {
        productId: PRODUCT_ID,
        orderId: ORDER_ID,
        rating: 5,
        comment: 'X',
      })).rejects.toThrow(NotFoundException);
    });
  });
});
