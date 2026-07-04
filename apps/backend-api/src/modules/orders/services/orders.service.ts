import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
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
import { OrderListResult, OrdersRepository } from '../repositories/orders.repository';
import { Order, OrderItem } from '../schemas/order.schema';

const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

/**
 * Time window (ms) within which a second order creation from the same user
 * with the same items is considered a duplicate. Prevents double-order when
 * the client retries or the IdempotencyService cache misses.
 */
const RECENT_ORDER_DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly productsService: ProductsService,
    private readonly cartService: CartService,
    private readonly databaseTransactionService: DatabaseTransactionService,
    private readonly eventBusService?: EventBusService,
  ) {}

  async createOrder(userId: string, dto: CreateOrderDto): Promise<Order> {
    this.validateDeliveryWindow(dto);

    const existingOrder = await this.findRecentDuplicateOrder(userId);
    if (existingOrder) {
      this.logger.warn(
        `Duplicate order creation prevented for user ${userId}. Returning existing order ${getEntityId(existingOrder)}.`,
      );
      return existingOrder;
    }

    const reducedItems: Array<{ productId: string; quantity: number }> = [];

    const order = await this.databaseTransactionService.executeWithCompensation({
      execute: async (session) => {
        const cart = await this.cartService.getCartByUserId(userId, session);

        if (!cart.items || cart.items.length === 0) {
          throw new BadRequestException('Cart is empty');
        }

        const orderItems: OrderItem[] = [];
        let totalPrice = 0;

        for (const item of cart.items) {
          const productId = getEntityId(item.productId);

          const product = await this.productsService.getProductById(productId, session);

          if (!product.isActive) {
            throw new BadRequestException(`Product "${product.name}" is not active`);
          }

          if (product.stock < item.quantity) {
            throw new BadRequestException(
              `Insufficient stock for product "${product.name}"`,
            );
          }

          const priceAtPurchase = product.discountPrice ?? product.price;

          orderItems.push({
            productId: new Types.ObjectId(productId),
            quantity: item.quantity,
            priceAtPurchase,
          });

          totalPrice += priceAtPurchase * item.quantity;

          await this.productsService.reduceStock(
            productId,
            item.quantity,
            session,
            false,
          );

          reducedItems.push({ productId, quantity: item.quantity });
        }

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

        await this.cartService.clearCart(userId, session);

        return createdOrder;
      },
      compensate: async () => {
        // Best-effort rollback of partial writes in non-transactional mode:
        // restore stock for products that were already reduced.
        for (const { productId, quantity } of reducedItems) {
          try {
            await this.productsService.restoreStock(productId, quantity, undefined, false);
          } catch {
            // Compensation is best-effort — log but don't throw
          }
        }
        this.logger.warn('[COMPENSATE] Order creation failed in non-transactional mode; stock restoration attempted for affected products.');
      },
    });

    const reducedProductIds = reducedItems.map((item) => item.productId);

    // Post-transaction search sync
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

  async getMyOrdersPaginated(
    userId: string,
    page: number,
    limit: number,
  ): Promise<OrderListResult> {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    return this.ordersRepository.findByUserIdPaginated(userId, safePage, safeLimit);
  }

  async getOrderById(
    orderId: string,
    userId: string,
    role: string,
  ): Promise<Order> {
    this.ensureValidObjectId(orderId, 'Invalid order id');

    const order = await this.ordersRepository.findById(orderId);
    if (!order) {
      throw new BadRequestException('Order not found');
    }

    if (!this.isAdminRole(role) && getEntityId(order.userId) !== userId) {
      throw new ForbiddenException('You cannot access this order');
    }

    return order;
  }

  async listAllOrders(): Promise<Order[]> {
    return this.ordersRepository.findAll();
  }

  async listAllOrdersPaginated(
    page: number,
    limit: number,
    status?: OrderStatus,
  ): Promise<OrderListResult> {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    return this.ordersRepository.findAllPaginated(safePage, safeLimit, status);
  }

  async updateStatus(
    orderId: string,
    status: OrderStatus,
    session?: ClientSession,
  ): Promise<Order> {
    this.ensureValidObjectId(orderId, 'Invalid order id');

    const current = await this.ordersRepository.findById(orderId);
    if (!current) {
      throw new BadRequestException('Order not found');
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
      throw new BadRequestException('Order not found');
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
      const transitioned = await this.ordersRepository.transitionStatus(
        orderId,
        cancellableStatuses,
        OrderStatus.CANCELLED,
        { cancelledAt: new Date() },
        activeSession,
      );

      if (!transitioned) {
        const existing = await this.ordersRepository.findById(orderId);
        if (!existing) {
          throw new BadRequestException('Order not found');
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

    if (restoredProductIds.length > 0) {
      await Promise.all(
        restoredProductIds.map((productId) =>
          this.productsService.syncProductToSearch(productId),
        ),
      );
    }

    return updatedOrder;
  }

  private async findRecentDuplicateOrder(userId: string): Promise<Order | null> {
    const since = new Date(Date.now() - RECENT_ORDER_DEDUP_WINDOW_MS);
    const recentPending = await this.ordersRepository.findRecentPendingByUserId(
      userId,
      since,
    );

    if (!recentPending) {
      return null;
    }

    try {
      const cart = await this.cartService.getCartByUserId(userId);
      if (cart.items && cart.items.length > 0) {
        return null;
      }
    } catch {
      return null;
    }

    return recentPending;
  }

  private validateDeliveryWindow(dto: CreateOrderDto): void {
    const deliveryDate = new Date(dto.deliveryWindow.date);
    if (Number.isNaN(deliveryDate.getTime())) {
      throw new BadRequestException('Invalid delivery window date');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(deliveryDate);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      throw new BadRequestException('Delivery date cannot be in the past');
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
