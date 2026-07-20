import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { PaginatedResult } from '../../shared/interfaces/pagination.interface';
import { CreateCouponDto, UpdateCouponDto } from './dto/coupon.dto';
import { CouponRepository } from './repositories/coupon.repository';
import { Coupon } from './schemas/coupon.schema';

export type CouponValidationResult = {
  couponId?: string;
  code: string;
  percent: number;
  discountAmount: number;
  subtotal: number;
  total: number;
};

@Injectable()
export class CouponsService {
  constructor(private readonly couponRepository: CouponRepository) {}

  async validateCoupon(
    code: string | undefined,
    subtotal: number,
    userId?: string,
    precomputedUsages?: Map<string, number>,
  ): Promise<CouponValidationResult | null> {
    const normalizedCode = this.normalizeCode(code);
    if (!normalizedCode) return null;

    if (!Number.isFinite(subtotal) || subtotal <= 0) {
      throw new BadRequestException('Cart total must be greater than zero');
    }

    const coupon = await this.couponRepository.findByCode(normalizedCode);
    if (!coupon || coupon.active === false) {
      throw new BadRequestException('Invalid coupon code');
    }

    await this.assertCouponIsUsable(coupon, subtotal, userId, precomputedUsages);

    const rawDiscount = Math.round(subtotal * (coupon.percent / 100));
    const cappedDiscount = coupon.maxDiscountAmount
      ? Math.min(rawDiscount, coupon.maxDiscountAmount)
      : rawDiscount;
    const discountAmount = Math.min(Math.max(cappedDiscount, 0), subtotal);

    return {
      couponId: coupon._id.toString(),
      code: normalizedCode,
      percent: coupon.percent,
      discountAmount,
      subtotal,
      total: Math.max(0, subtotal - discountAmount),
    };
  }

  async recordUsage(input: {
    couponId?: string;
    code?: string | null;
    userId: string;
    orderId: string;
    discountAmount: number;
  }): Promise<void> {
    if (!input.couponId || !input.code || input.discountAmount <= 0) return;
    try {
      const couponDoc = await this.couponRepository.findById(input.couponId);
      const usageLimit = couponDoc?.usageLimit ?? null;
      const updated = await this.couponRepository.incrementUsedCount(input.couponId, usageLimit);
      if (!updated) {
        throw new BadRequestException('Coupon usage limit reached');
      }
      await this.couponRepository.createUsage({
        couponId: new Types.ObjectId(input.couponId),
        code: input.code,
        userId: new Types.ObjectId(input.userId),
        orderId: new Types.ObjectId(input.orderId),
        discountAmount: input.discountAmount,
      });
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      // Coupon usage audit is best-effort; order creation must not fail after payment-critical writes.
    }
  }

  async listAvailableCoupons(subtotal: number, userId: string): Promise<CouponValidationResult[]> {
    const coupons = await this.couponRepository.list(1, 100, true);

    // Batch count usages for user to eliminate N+1 queries
    const couponIds = (coupons.items as Array<Coupon & { _id: Types.ObjectId }>).map(c => c._id.toString());
    const precomputedUsages = await this.couponRepository.countUsageForUserBatch(couponIds, userId);

    const results: CouponValidationResult[] = [];
    for (const coupon of coupons.items as Array<Coupon & { _id?: Types.ObjectId }>) {
      try {
        const result = await this.validateCoupon(coupon.code, subtotal, userId, precomputedUsages);
        if (result) results.push(result);
      } catch {
        // Hide unavailable coupons from customer-facing visibility.
      }
    }
    return results;
  }

  listCoupons(page = 1, limit = 20, active?: boolean): Promise<PaginatedResult<Coupon>> {
    return this.couponRepository.list(Math.max(page, 1), Math.min(Math.max(limit, 1), 100), active);
  }

  async getCoupon(id: string): Promise<Coupon> {
    const coupon = await this.couponRepository.findById(id);
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  async createCoupon(dto: CreateCouponDto): Promise<Coupon> {
    const data = this.normalizeCouponDto(dto);
    const existing = await this.couponRepository.findByCode(data.code as string);
    if (existing) throw new ConflictException('Coupon code already exists');
    return this.couponRepository.create(data);
  }

  async updateCoupon(id: string, dto: UpdateCouponDto): Promise<Coupon> {
    const data = this.normalizeCouponDto(dto);
    if (data.code) {
      const existing = await this.couponRepository.findByCode(data.code as string);
      if (existing && existing._id.toString() !== id) {
        throw new ConflictException('Coupon code already exists');
      }
    }
    const coupon = await this.couponRepository.update(id, data);
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  async deleteCoupon(id: string): Promise<Coupon> {
    const coupon = await this.couponRepository.softDelete(id);
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  getAnalytics() {
    return this.couponRepository.getAnalytics();
  }

  private normalizeCouponDto(dto: Partial<CreateCouponDto>): Partial<Coupon> {
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (startsAt && endsAt && startsAt > endsAt) {
      throw new BadRequestException('Coupon start date must be before end date');
    }

    return {
      ...(dto.code ? { code: this.normalizeCode(dto.code)! } : {}),
      ...(dto.percent !== undefined ? { percent: Number(dto.percent) } : {}),
      ...(dto.active !== undefined ? { active: dto.active } : {}),
      minSubtotal: Number(dto.minSubtotal ?? 0),
      maxDiscountAmount: dto.maxDiscountAmount === undefined ? null : dto.maxDiscountAmount,
      startsAt,
      endsAt,
      usageLimit: dto.usageLimit === undefined ? null : dto.usageLimit,
      perUserLimit: dto.perUserLimit === undefined ? null : dto.perUserLimit,
    };
  }

  private normalizeCode(code: string | undefined): string | null {
    const normalized = code?.trim().toUpperCase();
    return normalized || null;
  }

  private async assertCouponIsUsable(
    coupon: Coupon & { _id: Types.ObjectId },
    subtotal: number,
    userId?: string,
    precomputedUsages?: Map<string, number>,
  ): Promise<void> {
    const now = Date.now();
    if (coupon.startsAt && coupon.startsAt.getTime() > now) {
      throw new BadRequestException('Coupon is not active yet');
    }
    if (coupon.endsAt && coupon.endsAt.getTime() < now) {
      throw new BadRequestException('Coupon has expired');
    }
    if (coupon.minSubtotal !== undefined && subtotal < coupon.minSubtotal) {
      throw new BadRequestException('Cart total is below coupon minimum');
    }
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit reached');
    }
    if (coupon.perUserLimit && userId) {
      const userUsage = precomputedUsages
        ? (precomputedUsages.get(coupon._id.toString()) ?? 0)
        : await this.couponRepository.countUsageForUser(coupon._id.toString(), userId);
      if (userUsage >= coupon.perUserLimit) {
        throw new BadRequestException('Coupon user usage limit reached');
      }
    }
  }
}
