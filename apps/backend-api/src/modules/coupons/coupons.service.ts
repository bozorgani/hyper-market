import { BadRequestException, Injectable } from '@nestjs/common';

export type CouponValidationResult = {
  code: string;
  percent: number;
  discountAmount: number;
  subtotal: number;
  total: number;
};

type CouponConfig = {
  code: string;
  percent: number;
  active?: boolean;
  minSubtotal?: number;
  maxDiscountAmount?: number;
  startsAt?: string;
  endsAt?: string;
};

const DEVELOPMENT_COUPONS: CouponConfig[] = [
  { code: 'SNAPP20', percent: 20 },
  { code: 'HYPERSALE', percent: 15 },
  { code: 'WELCOME10', percent: 10 },
  { code: 'FREE50', percent: 50 },
  { code: 'MARKET30', percent: 30 },
];

@Injectable()
export class CouponsService {
  validateCoupon(code: string | undefined, subtotal: number): CouponValidationResult | null {
    const normalizedCode = this.normalizeCode(code);
    if (!normalizedCode) {
      return null;
    }

    if (!Number.isFinite(subtotal) || subtotal <= 0) {
      throw new BadRequestException('Cart total must be greater than zero');
    }

    const coupon = this.getConfiguredCoupons().find((item) => item.code === normalizedCode);
    if (!coupon || coupon.active === false) {
      throw new BadRequestException('Invalid coupon code');
    }

    this.assertCouponIsCurrentlyValid(coupon);

    if (coupon.minSubtotal !== undefined && subtotal < coupon.minSubtotal) {
      throw new BadRequestException('Cart total is below coupon minimum');
    }

    const rawDiscount = Math.round(subtotal * (coupon.percent / 100));
    const cappedDiscount = coupon.maxDiscountAmount
      ? Math.min(rawDiscount, coupon.maxDiscountAmount)
      : rawDiscount;
    const discountAmount = Math.min(Math.max(cappedDiscount, 0), subtotal);

    return {
      code: normalizedCode,
      percent: coupon.percent,
      discountAmount,
      subtotal,
      total: Math.max(0, subtotal - discountAmount),
    };
  }

  private normalizeCode(code: string | undefined): string | null {
    const normalized = code?.trim().toUpperCase();
    return normalized || null;
  }

  private getConfiguredCoupons(): CouponConfig[] {
    const raw = process.env.COUPON_CODES_JSON;
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as CouponConfig[];
        if (Array.isArray(parsed)) {
          return parsed
            .filter((coupon) => coupon.code && Number.isFinite(Number(coupon.percent)))
            .map((coupon) => ({
              ...coupon,
              code: coupon.code.trim().toUpperCase(),
              percent: Math.min(Math.max(Number(coupon.percent), 0), 100),
              minSubtotal: coupon.minSubtotal === undefined ? undefined : Number(coupon.minSubtotal),
              maxDiscountAmount: coupon.maxDiscountAmount === undefined ? undefined : Number(coupon.maxDiscountAmount),
            }));
        }
      } catch {
        throw new BadRequestException('Coupon configuration is invalid');
      }
    }

    return process.env.APP_ENV === 'production' ? [] : DEVELOPMENT_COUPONS;
  }

  private assertCouponIsCurrentlyValid(coupon: CouponConfig): void {
    const now = Date.now();
    if (coupon.startsAt && Date.parse(coupon.startsAt) > now) {
      throw new BadRequestException('Coupon is not active yet');
    }
    if (coupon.endsAt && Date.parse(coupon.endsAt) < now) {
      throw new BadRequestException('Coupon has expired');
    }
  }
}
