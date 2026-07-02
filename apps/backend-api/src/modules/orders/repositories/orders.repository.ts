import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, isValidObjectId, Model } from 'mongoose';
import { OrderStatus } from '../enums/order-status.enum';
import { Order, OrderDocument } from '../schemas/order.schema';

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

  async findById(id: string): Promise<Order | null> {
    if (!isValidObjectId(id)) return null;
    return this.orderModel.findById(id).lean().exec();
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
}
