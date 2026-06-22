import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { OrderStatus } from '../enums/order-status.enum';
import { Order, OrderDocument } from '../schemas/order.schema';

@Injectable()
export class OrdersRepository {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
  ) {}

  async create(data: Partial<Order>): Promise<Order> {
    const order = new this.orderModel(data);
    return order.save();
  }

  async findByUserId(userId: string): Promise<Order[]> {
    return this.orderModel.find({ userId }).sort({ createdAt: -1 }).lean().exec();
  }

  async findById(id: string): Promise<Order | null> {
    if (!isValidObjectId(id)) return null;
    return this.orderModel.findById(id).lean().exec();
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order | null> {
    if (!isValidObjectId(id)) return null;
    return this.orderModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .exec();
  }

  async findAll(): Promise<Order[]> {
    return this.orderModel.find().sort({ createdAt: -1 }).lean().exec();
  }
}
