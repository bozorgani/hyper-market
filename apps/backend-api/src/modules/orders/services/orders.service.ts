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

  async createOrder(userId: string): Promise<Order> {
    const reducedProductIds: string[] = [];

    const order = await this.databaseTransactionService.executeInTransaction(
      async (session) => {
        // ۱. دریافت سبد خرید داخل تراکنش
        const cart = await this.cartService.getCartByUserId(userId);

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
          const product = await this.productsService.getProductById(productId);

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

    const order = await this.ordersRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const allowedStatuses = ORDER_STATUS_TRANSITIONS[order.status];
    if (!allowedStatuses.includes(status)) {
      throw new BadRequestException('Invalid order status transition');
    }

    if (status === OrderStatus.CANCELLED) {
      return this.cancelOrder(orderId, order, session);
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
    order: Order,
    session?: ClientSession,
  ): Promise<Order> {
    const productIds = order.items.map((item) => getEntityId(item.productId));

    const restoreStockAndCancel = async (activeSession?: ClientSession) => {
      for (const item of order.items) {
        await this.productsService.restoreStock(
          getEntityId(item.productId),
          item.quantity,
          activeSession,
          false,
        );
      }

      const updatedOrder = await this.ordersRepository.updateStatus(
        orderId,
        OrderStatus.CANCELLED,
        activeSession,
      );

      if (!updatedOrder) {
        throw new NotFoundException('Order not found');
      }

      return updatedOrder;
    };

    const updatedOrder = session
      ? await restoreStockAndCancel(session)
      : await this.databaseTransactionService.executeInTransaction((activeSession) =>
          restoreStockAndCancel(activeSession),
        );

    await Promise.all(
      productIds.map((productId) =>
        this.productsService.syncProductToSearch(productId),
      ),
    );

    return updatedOrder;
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
