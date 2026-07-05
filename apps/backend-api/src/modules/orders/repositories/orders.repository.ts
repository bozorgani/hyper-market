import { Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../shared/interfaces/pagination.interface';
import { paginatedResult } from '../../../shared/utils/pagination.util';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, isValidObjectId, Model } from 'mongoose';
import { OrderStatus } from '../enums/order-status.enum';
import { Order, OrderDocument } from '../schemas/order.schema';

export type OrderListResult = PaginatedResult<Order>;

@Injectable()
export class OrdersRepository {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
  ) {}

  async create(data: Partial<Order>, session?: ClientSession): Promise<Order> {
    const order = new this.orderModel(data);
    return order.save({ session });
  }

  async findByUserId(userId: string): Promise<Order[]> {
    return this.orderModel.find({ userId }).sort({ createdAt: -1 }).lean().exec();
  }

  async findByUserIdPaginated(
    userId: string,
    page: number,
    limit: number,
  ): Promise<OrderListResult> {
    const skip = (page - 1) * limit;
    const filter = { userId };
    const [items, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.orderModel.countDocuments(filter).exec(),
    ]);
    return paginatedResult(items, total, page, limit);
  }

  async findById(id: string): Promise<Order | null> {
    if (!isValidObjectId(id)) return null;
    return this.orderModel.findById(id).lean().exec();
  }

  /**
   * Find the most recent PENDING order for a user created after `since`.
   * Used by the order dedup guard to detect and return a duplicate checkout
   * instead of creating a second order + double-reducing stock.
   */
  async findRecentPendingByUserId(
    userId: string,
    since: Date,
  ): Promise<Order | null> {
    return this.orderModel
      .findOne({
        userId,
        status: OrderStatus.PENDING,
        createdAt: { $gte: since },
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async countActiveByDeliveryWindow(
    date: Date,
    timeSlot: string,
    province: string,
    city: string,
  ): Promise<number> {
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + 1);

    return this.orderModel
      .countDocuments({
        status: {
          $in: [
            OrderStatus.PENDING,
            OrderStatus.PAID,
            OrderStatus.PROCESSING,
            OrderStatus.SHIPPED,
          ],
        },
        'deliveryWindow.date': { $gte: selectedDate, $lt: nextDate },
        'deliveryWindow.timeSlot': timeSlot,
        'deliveryAddress.province': province,
        'deliveryAddress.city': city,
      })
      .exec();
  }

  async updateStatus(
    id: string,
    status: OrderStatus,
    session?: ClientSession,
  ): Promise<Order | null> {
    if (!isValidObjectId(id)) return null;
    return this.orderModel
      .findByIdAndUpdate(id, { status }, { returnDocument: 'after', session })
      .exec();
  }

  /**
   * Conditional, atomic status transition. Succeeds (and returns the new
   * document) only when the order's current status is one of `allowedFrom`.
   * Used by cancellation so that concurrent / retried cancel requests cannot
   * both pass the transition and double-restore inventory.
   */
  async transitionStatus(
    id: string,
    allowedFrom: OrderStatus[],
    toStatus: OrderStatus,
    extra: Partial<Order> = {},
    session?: ClientSession,
  ): Promise<Order | null> {
    if (!isValidObjectId(id)) return null;
    return this.orderModel
      .findOneAndUpdate(
        { _id: id, status: { $in: allowedFrom } },
        { $set: { status: toStatus, ...extra } },
        { returnDocument: 'after', session },
      )
      .exec();
  }

  async findAll(): Promise<Order[]> {
    return this.orderModel.find().sort({ createdAt: -1 }).lean().exec();
  }

  async findAllPaginated(
    page: number,
    limit: number,
    status?: OrderStatus,
  ): Promise<OrderListResult> {
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = {};
    if (status) {
      filter.status = status;
    }
    const [items, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.orderModel.countDocuments(filter).exec(),
    ]);
    return paginatedResult(items, total, page, limit);
  }
}
