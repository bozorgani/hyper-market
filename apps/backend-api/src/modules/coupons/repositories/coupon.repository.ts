import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { paginatedResult } from '../../../shared/utils/pagination.util';
import { PaginatedResult } from '../../../shared/interfaces/pagination.interface';
import { Coupon, CouponDocument } from '../schemas/coupon.schema';
import { CouponUsage, CouponUsageDocument } from '../schemas/coupon-usage.schema';

@Injectable()
export class CouponRepository {
  constructor(
    @InjectModel(Coupon.name) private readonly couponModel: Model<CouponDocument>,
    @InjectModel(CouponUsage.name) private readonly usageModel: Model<CouponUsageDocument>,
  ) {}

  async create(data: Partial<Coupon>): Promise<Coupon> {
    return new this.couponModel(data).save();
  }

  async findByCode(code: string): Promise<(Coupon & { _id: Types.ObjectId }) | null> {
    return this.couponModel.findOne({ code, deletedAt: null }).lean<Coupon & { _id: Types.ObjectId }>().exec();
  }

  async findById(id: string): Promise<Coupon | null> {
    if (!isValidObjectId(id)) return null;
    return this.couponModel.findOne({ _id: id, deletedAt: null }).lean().exec();
  }

  async list(page: number, limit: number, active?: boolean): Promise<PaginatedResult<Coupon>> {
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = { deletedAt: null };
    if (active !== undefined) filter.active = active;
    const [items, total] = await Promise.all([
      this.couponModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.couponModel.countDocuments(filter).exec(),
    ]);
    return paginatedResult(items, total, page, limit);
  }

  async update(id: string, data: Partial<Coupon>): Promise<Coupon | null> {
    if (!isValidObjectId(id)) return null;
    return this.couponModel.findOneAndUpdate({ _id: id, deletedAt: null }, data, { returnDocument: 'after' }).exec();
  }

  async softDelete(id: string): Promise<Coupon | null> {
    if (!isValidObjectId(id)) return null;
    return this.couponModel.findOneAndUpdate({ _id: id, deletedAt: null }, { deletedAt: new Date(), active: false }, { returnDocument: 'after' }).exec();
  }

  async incrementUsedCount(id: string, usageLimit?: number | null): Promise<Coupon | null> {
    const filter: any = { _id: new Types.ObjectId(id) };
    if (usageLimit !== null && usageLimit !== undefined && usageLimit > 0) {
      filter.usedCount = { $lt: usageLimit };
    }
    return this.couponModel
      .findOneAndUpdate(filter, { $inc: { usedCount: 1 } }, { returnDocument: 'after', new: true })
      .exec();
  }

  async countUsageForUser(couponId: string, userId: string): Promise<number> {
    if (!isValidObjectId(couponId) || !isValidObjectId(userId)) return 0;
    return this.usageModel.countDocuments({ couponId: new Types.ObjectId(couponId), userId: new Types.ObjectId(userId) }).exec();
  }

  async countUsageForUserBatch(couponIds: string[], userId: string): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (couponIds.length === 0 || !isValidObjectId(userId)) return map;

    const validCouponIds = couponIds.filter(id => isValidObjectId(id)).map(id => new Types.ObjectId(id));
    if (validCouponIds.length === 0) return map;

    const results = await this.usageModel.aggregate<{ _id: Types.ObjectId; count: number }>([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          couponId: { $in: validCouponIds },
        },
      },
      {
        $group: {
          _id: '$couponId',
          count: { $sum: 1 },
        },
      },
    ]).exec();

    for (const res of results) {
      map.set(res._id.toString(), res.count);
    }

    return map;
  }

  async createUsage(data: Partial<CouponUsage>): Promise<CouponUsage> {
    return new this.usageModel(data).save();
  }

  async getAnalytics() {
    const [totalCoupons, activeCoupons, usageAgg] = await Promise.all([
      this.couponModel.countDocuments({ deletedAt: null }).exec(),
      this.couponModel.countDocuments({ deletedAt: null, active: true }).exec(),
      this.usageModel.aggregate<{ usages: number; discountAmount: number }>([
        { $group: { _id: null, usages: { $sum: 1 }, discountAmount: { $sum: '$discountAmount' } } },
      ]).exec(),
    ]);

    return {
      totalCoupons,
      activeCoupons,
      totalUsages: usageAgg[0]?.usages ?? 0,
      totalDiscountAmount: usageAgg[0]?.discountAmount ?? 0,
    };
  }
}
