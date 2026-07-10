import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, isValidObjectId, Model } from 'mongoose';
import { PaymentStatus } from '../enums/payment-status.enum';
import { Payment, PaymentDocument } from '../schemas/payment.schema';

export type AdminPaymentListItem = Omit<Payment, 'orderId'> & {
  orderId: string;
  order: { _id: string; totalPrice: number } | null;
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

  async findByOrderIds(orderIds: string[]): Promise<Payment[]> {
    const validIds = orderIds.filter((id) => isValidObjectId(id));
    if (validIds.length === 0) {
      return [];
    }
    return this.paymentModel
      .find({ orderId: { $in: validIds } })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async findAllPaginated(
    page: number,
    limit: number,
    status?: PaymentStatus,
    search?: string,
  ): Promise<{ items: AdminPaymentListItem[]; total: number }> {
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;

    if (search) {
      const pattern = escapeRegex(search);
      filter.$or = [
        { transactionId: { $regex: pattern, $options: "i" } },
        ...(isValidObjectId(search) ? [{ orderId: search }] : []),
        ...(!isValidObjectId(search)
          ? [{ $expr: { $regexMatch: { input: { $toString: "$orderId" }, regex: pattern, options: "i" } } }]
          : []),
      ];
    }

    const [payments, total] = await Promise.all([
      this.paymentModel
        .find(filter)
        .populate("orderId", "_id totalPrice")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.paymentModel.countDocuments(filter).exec(),
    ]);

    const items = payments.map((payment) => {
      const populatedOrder = payment.orderId as unknown as { _id?: unknown; totalPrice?: number };
      const hasOrder = Boolean(populatedOrder && typeof populatedOrder === "object" && populatedOrder._id);
      const orderId = hasOrder ? String(populatedOrder._id) : String(payment.orderId);
      return {
        ...payment,
        orderId,
        order: hasOrder && typeof populatedOrder.totalPrice === "number"
          ? { _id: orderId, totalPrice: populatedOrder.totalPrice }
          : null,
      };
    }) as AdminPaymentListItem[];

    return { items, total };
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
