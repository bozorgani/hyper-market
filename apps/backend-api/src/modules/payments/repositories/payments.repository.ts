import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, isValidObjectId, Model } from 'mongoose';
import { PaymentStatus } from '../enums/payment-status.enum';
import { Payment, PaymentDocument } from '../schemas/payment.schema';

@Injectable()
export class PaymentsRepository {
  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
  ) {}

  async create(data: Partial<Payment>): Promise<Payment> {
    const payment = new this.paymentModel(data);
    return payment.save();
  }

  async findByOrderId(orderId: string): Promise<Payment | null> {
    if (!isValidObjectId(orderId)) return null;
    return this.paymentModel
      .findOne({ orderId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async findPendingByOrderId(orderId: string): Promise<Payment | null> {
    if (!isValidObjectId(orderId)) return null;
    return this.paymentModel
      .findOne({ orderId, status: PaymentStatus.PENDING })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async updateStatus(
    id: string,
    status: PaymentStatus,
    transactionId?: string,
    session?: ClientSession,
  ): Promise<Payment | null> {
    if (!isValidObjectId(id)) return null;

    return this.paymentModel
      .findByIdAndUpdate(
        id,
        {
          status,
          ...(transactionId ? { transactionId } : {}),
        },
        { returnDocument: 'after', session },
      )
      .exec();
  }

  async markAsPaid(
    id: string,
    transactionId: string,
    session?: ClientSession,
  ): Promise<Payment | null> {
    if (!isValidObjectId(id)) return null;
    return this.paymentModel
      .findOneAndUpdate(
        { _id: id, status: PaymentStatus.PENDING },
        { status: PaymentStatus.PAID, transactionId },
        { returnDocument: 'after', session },
      )
      .exec();
  }

  async markAsFailed(id: string, transactionId?: string): Promise<Payment | null> {
    return this.updateStatus(id, PaymentStatus.FAILED, transactionId);
  }
}
