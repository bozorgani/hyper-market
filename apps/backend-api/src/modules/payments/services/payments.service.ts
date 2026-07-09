import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ClientSession, isValidObjectId, Types } from 'mongoose';
import { EventBusService } from '../../../core/events/event-bus.service';
import { EventType } from '../../../core/events/enums/event-type.enum';
import { DatabaseTransactionService } from '../../../infrastructure/database/database-transaction.service';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { getEntityId } from '../../../shared/utils/entity-id.util';
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
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly ordersService: OrdersService,
    private readonly databaseTransactionService: DatabaseTransactionService,
    private readonly redisService: RedisService,
    private readonly eventBusService?: EventBusService,
  ) {}

  /**
   * Create a payment record for an order.
   *
   * For COD (Cash on Delivery / پرداخت در محل) the payment is
   * automatically confirmed and the order transitions to PAID in a single
   * transaction — no external gateway is involved.
   *
   * For future online gateways (Stripe/Zarinpal) a PENDING payment is
   * created and a separate callback/webhook endpoint will confirm it later.
   */
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

    const method = dto.method ?? PaymentMethod.COD;

    // ── Redis distributed lock: prevent concurrent COD payments for same order ──
    const lockKey = `payment:cod:${dto.orderId}`;
    const acquired = await this.redisService.setIfNotExists(lockKey, '1', 10);
    if (!acquired) {
      throw new ConflictException('Payment already in progress for this order');
    }

    try {
      // ── COD: auto-confirm payment + transition order to PAID ──────────
      if (method === PaymentMethod.COD) {
        return this.confirmCashOnDelivery(userId, role, order.totalPrice, dto.orderId);
      }

      // ── Online gateways (future): create PENDING and wait for callback ─
      return this.paymentsRepository.create({
        orderId: new Types.ObjectId(dto.orderId),
        userId: new Types.ObjectId(userId),
        amount: order.totalPrice,
        status: PaymentStatus.PENDING,
        method,
        transactionId: null,
      });
    } finally {
      // Release the lock (best-effort in finally block)
      try {
        await this.redisService.delete(lockKey);
      } catch {
        // Lock TTL will expire anyway
      }
    }
  }

  /**
   * COD auto-confirmation: payment is marked PAID immediately and the
   * order transitions to PAID inside a single MongoDB transaction.
   */
  private async confirmCashOnDelivery(
    userId: string,
    role: string,
    amount: number,
    orderId: string,
  ): Promise<Payment> {
    const transactionId = `cod_${randomUUID()}`;

    const paidPayment = await this.databaseTransactionService.executeWithCompensation({
      execute: async (session) => {
        const payment = await this.paymentsRepository.create({
          orderId: new Types.ObjectId(orderId),
          userId: new Types.ObjectId(userId),
          amount,
          status: PaymentStatus.PAID,
          method: PaymentMethod.COD,
          transactionId,
        });

        await this.updateOrderStatusAfterPayment(orderId, userId, role, session);

        return payment;
      },
      compensate: async () => {
        // Best-effort: if order status update failed after payment was created,
        // mark the payment as FAILED so the order can be re-paid later.
        try {
          const payment = await this.paymentsRepository.findByOrderId(orderId);
          if (payment && payment.status === PaymentStatus.PAID) {
            await this.paymentsRepository.markAsFailed(
              getEntityId(payment),
              transactionId,
            );
          }
        } catch {
          // Compensation is best-effort
        }
        this.logger.warn(
          '[COMPENSATE] COD payment creation failed in non-transactional mode; attempted to mark payment as FAILED.',
        );
      },
    });

    this.eventBusService?.emit({
      type: EventType.ORDER_PAID,
      payload: {
        userId,
        orderId,
        paymentId: getEntityId(paidPayment),
        amount: paidPayment.amount,
        transactionId: paidPayment.transactionId ?? transactionId,
        method: PaymentMethod.COD,
      },
      timestamp: Date.now(),
    });

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

    if (!this.isAdminRole(role) && getEntityId(payment.userId) !== userId) {
      throw new ForbiddenException('You cannot access this payment');
    }

    return payment;
  }

  async findPaymentsByOrderIds(
    orderIds: string[],
    userId: string,
    role: string,
  ): Promise<Payment[]> {
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return [];
    }

    const payments = await this.paymentsRepository.findByOrderIds(orderIds);
    if (this.isAdminRole(role)) {
      return payments;
    }

    return payments.filter((payment) => getEntityId(payment.userId) === userId);
  }

  async updateOrderStatusAfterPayment(
    orderId: string,
    userId: string,
    role: string,
    session?: ClientSession,
  ): Promise<void> {
    const order = await this.ordersService.getOrderById(orderId, userId, role);

    if (order.status === OrderStatus.PAID) {
      return;
    }

    await this.ordersService.updateStatus(orderId, OrderStatus.PAID, session);
  }

  async markAsFailed(
    orderId: string,
    userId: string,
    role: string,
    transactionId?: string,
  ): Promise<Payment> {
    const payment = await this.verifyPayment(orderId, userId, role);
    const failedPayment = await this.paymentsRepository.markAsFailed(
      getEntityId(payment),
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
}
