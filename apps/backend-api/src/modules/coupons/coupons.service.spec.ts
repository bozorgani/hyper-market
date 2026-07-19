import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CouponRepository } from './repositories/coupon.repository';
import { Types } from 'mongoose';

const COUPON_ID = '507f1f77bcf86cd799439011';

const mockCoupon = {
  _id: new Types.ObjectId(COUPON_ID),
  code: 'SUMMER50',
  percent: 10,
  active: true,
  minSubtotal: 100,
  maxDiscountAmount: 50,
  startsAt: new Date(Date.now() - 3600 * 1000), // active
  endsAt: new Date(Date.now() + 3600 * 1000), // active
  usedCount: 0,
  usageLimit: 100,
  perUserLimit: 2,
};

describe('CouponsService', () => {
  let service: CouponsService;
  let repository: {
    findByCode: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    softDelete: jest.Mock;
    createUsage: jest.Mock;
    incrementUsedCount: jest.Mock;
    countUsageForUser: jest.Mock;
    list: jest.Mock;
    getAnalytics: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      findByCode: jest.fn().mockResolvedValue(mockCoupon),
      findById: jest.fn().mockResolvedValue(mockCoupon),
      create: jest.fn().mockResolvedValue(mockCoupon),
      update: jest.fn().mockResolvedValue(mockCoupon),
      softDelete: jest.fn().mockResolvedValue(mockCoupon),
      createUsage: jest.fn().mockResolvedValue({}),
      incrementUsedCount: jest.fn().mockResolvedValue(mockCoupon),
      countUsageForUser: jest.fn().mockResolvedValue(0),
      list: jest.fn().mockResolvedValue({ items: [mockCoupon], total: 1 }),
      getAnalytics: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponsService,
        { provide: CouponRepository, useValue: repository },
      ],
    }).compile();

    service = module.get<CouponsService>(CouponsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('validateCoupon', () => {
    it('should successfully validate and calculate discount', async () => {
      const result = await service.validateCoupon('SUMMER50', 200, 'user-123');
      expect(result).toEqual({
        couponId: COUPON_ID,
        code: 'SUMMER50',
        percent: 10,
        discountAmount: 20,
        subtotal: 200,
        total: 180,
      });
    });

    it('should cap discount with maxDiscountAmount', async () => {
      const result = await service.validateCoupon('SUMMER50', 1000, 'user-123');
      expect(result?.discountAmount).toBe(50); // Capped by maxDiscountAmount
    });

    it('should throw BadRequestException if subtotal is zero or negative', async () => {
      await expect(service.validateCoupon('SUMMER50', 0, 'user-123')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if coupon has expired', async () => {
      const expiredCoupon = { ...mockCoupon, endsAt: new Date(Date.now() - 3600 * 1000) };
      repository.findByCode.mockResolvedValue(expiredCoupon);

      await expect(service.validateCoupon('SUMMER50', 200, 'user-123')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if coupon is not active yet', async () => {
      const inactiveCoupon = { ...mockCoupon, startsAt: new Date(Date.now() + 3600 * 1000) };
      repository.findByCode.mockResolvedValue(inactiveCoupon);

      await expect(service.validateCoupon('SUMMER50', 200, 'user-123')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if subtotal is below minimum subtotal', async () => {
      await expect(service.validateCoupon('SUMMER50', 50, 'user-123')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if coupon code does not exist', async () => {
      repository.findByCode.mockResolvedValue(null);
      await expect(service.validateCoupon('INVALID', 200, 'user-123')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if user usage limit is exceeded', async () => {
      repository.countUsageForUser.mockResolvedValue(2); // limit is 2
      await expect(service.validateCoupon('SUMMER50', 200, 'user-123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('createCoupon', () => {
    it('should successfully create a new coupon', async () => {
      repository.findByCode.mockResolvedValue(null);
      const result = await service.createCoupon({
        code: 'WINTER20',
        percent: 20,
        startsAt: new Date().toISOString(),
        endsAt: new Date(Date.now() + 360000).toISOString(),
      });
      expect(result).toBe(mockCoupon);
    });

    it('should throw ConflictException if coupon code already exists', async () => {
      await expect(service.createCoupon({ code: 'SUMMER50', percent: 10 })).rejects.toThrow(ConflictException);
    });
  });

  describe('updateCoupon', () => {
    it('should successfully update coupon details', async () => {
      repository.findByCode.mockResolvedValue(null);
      const result = await service.updateCoupon(COUPON_ID, { code: 'SUMMER50', percent: 15 });
      expect(result).toBe(mockCoupon);
    });

    it('should throw NotFoundException if coupon is not found', async () => {
      repository.update.mockResolvedValue(null);
      await expect(service.updateCoupon(COUPON_ID, { code: 'SUMMER50', percent: 15 })).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteCoupon', () => {
    it('should successfully delete coupon', async () => {
      const result = await service.deleteCoupon(COUPON_ID);
      expect(result).toBe(mockCoupon);
    });

    it('should throw NotFoundException if coupon is not found for deletion', async () => {
      repository.softDelete.mockResolvedValue(null);
      await expect(service.deleteCoupon(COUPON_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('recordUsage', () => {
    it('should successfully increment coupon usage count atomically', async () => {
      repository.findById.mockResolvedValue(mockCoupon);
      repository.incrementUsedCount.mockResolvedValue(mockCoupon);
      repository.createUsage.mockResolvedValue({});

      await service.recordUsage({
        couponId: COUPON_ID,
        code: 'SUMMER50',
        userId: '507f1f77bcf86cd799439013',
        orderId: '507f1f77bcf86cd799439014',
        discountAmount: 20,
      });

      expect(repository.incrementUsedCount).toHaveBeenCalledWith(COUPON_ID, 100);
      expect(repository.createUsage).toHaveBeenCalled();
    });

    it('should throw BadRequestException when usage limit is reached', async () => {
      repository.findById.mockResolvedValue(mockCoupon);
      repository.incrementUsedCount.mockResolvedValue(null);

      await expect(
        service.recordUsage({
          couponId: COUPON_ID,
          code: 'SUMMER50',
          userId: '507f1f77bcf86cd799439013',
          orderId: '507f1f77bcf86cd799439014',
          discountAmount: 20,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent concurrent usage from exceeding limit', async () => {
      repository.findById.mockResolvedValue({ ...mockCoupon, usedCount: 99, usageLimit: 100 });
      repository.incrementUsedCount.mockResolvedValueOnce({ ...mockCoupon, usedCount: 100 });
      repository.incrementUsedCount.mockResolvedValueOnce(null);

      await service.recordUsage({ couponId: COUPON_ID, code: 'SUMMER50', userId: '507f1f77bcf86cd799439013', orderId: '507f1f77bcf86cd799439014', discountAmount: 20 });
      await expect(
        service.recordUsage({ couponId: COUPON_ID, code: 'SUMMER50', userId: '507f1f77bcf86cd799439015', orderId: '507f1f77bcf86cd799439016', discountAmount: 20 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow increment without usage limit', async () => {
      const noLimitCoupon = { ...mockCoupon, usageLimit: null };
      repository.findById.mockResolvedValue(noLimitCoupon);
      repository.incrementUsedCount.mockResolvedValue(noLimitCoupon);
      repository.createUsage.mockResolvedValue({});

      await service.recordUsage({ couponId: COUPON_ID, code: 'SUMMER50', userId: '507f1f77bcf86cd799439013', orderId: '507f1f77bcf86cd799439014', discountAmount: 10 });
      expect(repository.incrementUsedCount).toHaveBeenCalledWith(COUPON_ID, null);
    });
  });
});
