import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { isValidObjectId, Types } from 'mongoose';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { OrdersService } from '../../orders/services/orders.service';
import { UserRole } from '../../users/enums/user-role.enum';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentsRepository } from '../repositories/payments.repository';
import { Payment } from '../schemas/payment.schema';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly ordersService: OrdersService,
  ) {}

  async createPaymentFromOrder(
    userId: string,
    role: string,
    dto: CreatePaymentDto,
  ): Promise<Payment> {
    this.ensureValidObjectId(dto.orderId, 'Invalid order id');

    const order = await this.ordersService.getOrderById(dto.orderId, userId, role);

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Payment can only be created for pending orders');
    }

    const existingPayment = await this.paymentsRepository.findByOrderId(dto.orderId);
    if (existingPayment?.status === PaymentStatus.PAID) {
      throw new BadRequestException('Order is already paid');
    }

    const pendingPayment = await this.paymentsRepository.findPendingByOrderId(
      dto.orderId,
    );
    if (pendingPayment) {
      return pendingPayment;
    }

    return this.paymentsRepository.create({
      orderId: new Types.ObjectId(dto.orderId),
      userId: new Types.ObjectId(userId),
      amount: order.totalPrice,
      status: PaymentStatus.PENDING,
      method: dto.method ?? PaymentMethod.MOCK,
      transactionId: null,
    });
  }

  async simulatePaymentSuccess(
    userId: string,
    role: string,
    orderId: string,
    transactionId?: string,
  ): Promise<Payment> {
    const payment = await this.verifyPayment(orderId, userId, role);

    if (payment.status === PaymentStatus.PAID) {
      return payment;
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Only pending payments can be completed');
    }

    const paidPayment = await this.paymentsRepository.markAsPaid(
      this.getEntityId(payment),
      transactionId ?? `mock_${randomUUID()}`,
    );

    if (!paidPayment) {
      const currentPayment = await this.verifyPayment(orderId, userId, role);
      if (currentPayment.status === PaymentStatus.PAID) {
        return currentPayment;
      }

      throw new BadRequestException('Payment could not be completed');
    }

    await this.updateOrderStatusAfterPayment(orderId, userId, role);

    return paidPayment;
  }

  async verifyPayment(
    orderId: string,
    userId: string,
    role: string,
  ): Promise<Payment> {
    this.ensureValidObjectId(orderId, 'Invalid order id');

    const payment = await this.paymentsRepository.findByOrderId(orderId);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (!this.isAdminRole(role) && this.getEntityId(payment.userId) !== userId) {
      throw new ForbiddenException('You cannot access this payment');
    }

    return payment;
  }

  async updateOrderStatusAfterPayment(
    orderId: string,
    userId: string,
    role: string,
  ): Promise<void> {
    const order = await this.ordersService.getOrderById(orderId, userId, role);

    if (order.status === OrderStatus.PAID) {
      return;
    }

    await this.ordersService.updateStatus(orderId, OrderStatus.PAID);
  }

  async markAsFailed(
    orderId: string,
    userId: string,
    role: string,
    transactionId?: string,
  ): Promise<Payment> {
    const payment = await this.verifyPayment(orderId, userId, role);
    const failedPayment = await this.paymentsRepository.markAsFailed(
      this.getEntityId(payment),
      transactionId,
    );

    if (!failedPayment) {
      throw new NotFoundException('Payment not found');
    }

    return failedPayment;
  }

  private ensureValidObjectId(id: string, message: string): void {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(message);
    }
  }

  private isAdminRole(role: string): boolean {
    return role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
  }

  private getEntityId(entity: unknown): string {
    if (entity instanceof Types.ObjectId) {
      return entity.toHexString();
    }

    const withId = entity as { _id?: Types.ObjectId | string; id?: string };

    if (withId._id instanceof Types.ObjectId) {
      return withId._id.toHexString();
    }

    if (typeof withId._id === 'string') {
      return withId._id;
    }

    if (typeof withId.id === 'string') {
      return withId.id;
    }

    return String(entity);
  }
}
