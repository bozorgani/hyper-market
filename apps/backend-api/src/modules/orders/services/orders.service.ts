import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClientSession, isValidObjectId, Types } from 'mongoose';
import { EventBusService } from '../../../core/events/event-bus.service';
import { EventType } from '../../../core/events/enums/event-type.enum';
import { DatabaseTransactionService } from '../../../infrastructure/database/database-transaction.service';
import { getEntityId } from '../../../shared/utils/entity-id.util';
import { CartService } from '../../cart/services/cart.service';
import { ProductsService } from '../../products/services/products.service';
import { UserRole } from '../../users/enums/user-role.enum';
import { CreateOrderDto } from '../dto/create-order.dto';
import { OrderStatus } from '../enums/order-status.enum';
import { OrdersRepository } from '../repositories/orders.repository';
import { Order, OrderItem } from '../schemas/order.schema';

const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly productsService: ProductsService,
    private readonly cartService: CartService,
    private readonly databaseTransactionService: DatabaseTransactionService,
    private readonly eventBusService?: EventBusService,
  ) {}

  async createOrder(userId: string, dto: CreateOrderDto): Promise<Order> {
    this.validateDeliveryWindow(dto);
    const reducedProductIds: string[] = [];

    const order = await this.databaseTransactionService.executeInTransaction(
      async (session) => {
        // ۱. دریافت سبد خرید داخل تراکنش
        const cart = await this.cartService.getCartByUserId(userId, session);

        if (!cart.items || cart.items.length === 0) {
          throw new BadRequestException('سبد خرید خالی است');
        }

        const orderItems: OrderItem[] = [];
        let totalPrice = 0;

        // ۲. بررسی مجدد موجودی + قیمت + وضعیت محصول داخل تراکنش (جلوگیری از Race Condition)
        for (const item of cart.items) {
          const productId = getEntityId(item.productId);
          reducedProductIds.push(productId);

          // دریافت محصول با سشن (برای consistency)
          const product = await this.productsService.getProductById(productId, session);

          if (!product.isActive) {
            throw new BadRequestException(`محصول ${product.name} فعال نیست`);
          }

          if (product.stock < item.quantity) {
            throw new BadRequestException(
              `موجودی محصول ${product.name} کافی نیست`,
            );
          }

          const priceAtPurchase = product.discountPrice ?? product.price;

          orderItems.push({
            productId: new Types.ObjectId(productId),
            quantity: item.quantity,
            priceAtPurchase,
          });

          totalPrice += priceAtPurchase * item.quantity;

          // کاهش موجودی داخل تراکنش
          await this.productsService.reduceStock(
            productId,
            item.quantity,
            session,
            false,
          );
        }

        // ۳. ایجاد سفارش با قیمت لحظه‌ای (Price Snapshot)
        const createdOrder = await this.ordersRepository.create(
          {
            userId: new Types.ObjectId(userId),
            items: orderItems,
            totalPrice,
            status: OrderStatus.PENDING,
            deliveryAddress: {
              recipientName: dto.deliveryAddress.recipientName.trim(),
              phoneNumber: dto.deliveryAddress.phoneNumber.trim(),
              province: dto.deliveryAddress.province.trim(),
              city: dto.deliveryAddress.city.trim(),
              addressLine: dto.deliveryAddress.addressLine.trim(),
              plate: dto.deliveryAddress.plate?.trim() || null,
              unit: dto.deliveryAddress.unit?.trim() || null,
              postalCode: dto.deliveryAddress.postalCode?.trim() || null,
            },
            deliveryWindow: {
              date: new Date(dto.deliveryWindow.date),
              timeSlot: dto.deliveryWindow.timeSlot,
            },
          },
          session,
        );

        // ۴. پاک کردن سبد خرید
        await this.cartService.clearCart(userId, session);

        return createdOrder;
      },
    );

    // همگام‌سازی جستجو بعد از تراکنش (خارج از تراکنش)
    await Promise.all(
      reducedProductIds.map((productId) =>
        this.productsService.syncProductToSearch(productId),
      ),
    );

    this.eventBusService?.emit({
      type: EventType.ORDER_CREATED,
      payload: {
        userId,
        orderId: getEntityId(order),
        totalPrice: order.totalPrice,
        itemsCount: order.items.length,
      },
      timestamp: Date.now(),
    });

    return order;
  }

  async getMyOrders(userId: string): Promise<Order[]> {
    return this.ordersRepository.findByUserId(userId);
  }

  async getOrderById(
    orderId: string,
    userId: string,
    role: string,
  ): Promise<Order> {
    this.ensureValidObjectId(orderId, 'Invalid order id');

    const order = await this.ordersRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!this.isAdminRole(role) && getEntityId(order.userId) !== userId) {
      throw new ForbiddenException('You cannot access this order');
    }

    return order;
  }

  async listAllOrders(): Promise<Order[]> {
    return this.ordersRepository.findAll();
  }

  async updateStatus(
    orderId: string,
    status: OrderStatus,
    session?: ClientSession,
  ): Promise<Order> {
    this.ensureValidObjectId(orderId, 'Invalid order id');

    // User-facing legality check against the current status. The *actual* write
    // is performed as a conditional, atomic transition (inside the transaction
    // for cancellation) to avoid TOCTOU between this read and the mutation.
    const current = await this.ordersRepository.findById(orderId);
    if (!current) {
      throw new NotFoundException('Order not found');
    }

    const allowedStatuses = ORDER_STATUS_TRANSITIONS[current.status];
    if (!allowedStatuses.includes(status)) {
      throw new BadRequestException('Invalid order status transition');
    }

    if (status === OrderStatus.CANCELLED) {
      return this.cancelOrder(orderId, session);
    }

    const updatedOrder = await this.ordersRepository.updateStatus(
      orderId,
      status,
      session,
    );
    if (!updatedOrder) {
      throw new NotFoundException('Order not found');
    }

    return updatedOrder;
  }

  private async cancelOrder(
    orderId: string,
    session?: ClientSession,
  ): Promise<Order> {
    const cancellableStatuses = [
      OrderStatus.PENDING,
      OrderStatus.PAID,
      OrderStatus.PROCESSING,
    ];

    const restoredProductIds: string[] = [];

    const run = async (activeSession?: ClientSession): Promise<Order> => {
      // Conditional, atomic transition: only succeeds if the order is currently
      // in a cancellable state. This makes cancellation idempotent — concurrent
      // or retried cancel requests find the order already CANCELLED and the
      // filter matches nothing, so inventory is restored exactly once.
      const transitioned = await this.ordersRepository.transitionStatus(
        orderId,
        cancellableStatuses,
        OrderStatus.CANCELLED,
        { cancelledAt: new Date() },
        activeSession,
      );

      if (!transitioned) {
        // Already cancelled (or not cancellable): re-read and return without
        // touching inventory. Same logical result for the caller.
        const existing = await this.ordersRepository.findById(orderId);
        if (!existing) {
          throw new NotFoundException('Order not found');
        }
        return existing;
      }

      for (const item of transitioned.items) {
        const productId = getEntityId(item.productId);
        restoredProductIds.push(productId);
        await this.productsService.restoreStock(
          productId,
          item.quantity,
          activeSession,
          false,
        );
      }

      return transitioned;
    };

    const updatedOrder = session
      ? await run(session)
      : await this.databaseTransactionService.executeInTransaction((activeSession) =>
          run(activeSession),
        );

    // Search sync happens after the transaction (reads latest committed stock).
    if (restoredProductIds.length > 0) {
      await Promise.all(
        restoredProductIds.map((productId) =>
          this.productsService.syncProductToSearch(productId),
        ),
      );
    }

    return updatedOrder;
  }

  private validateDeliveryWindow(dto: CreateOrderDto): void {
    const deliveryDate = new Date(dto.deliveryWindow.date);
    if (Number.isNaN(deliveryDate.getTime())) {
      throw new BadRequestException('زمان تحویل معتبر نیست');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(deliveryDate);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      throw new BadRequestException('زمان تحویل نمی‌تواند در گذشته باشد');
    }
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
