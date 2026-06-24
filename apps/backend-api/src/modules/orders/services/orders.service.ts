import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClientSession, isValidObjectId, Types } from 'mongoose';
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
  ) {}

  async createOrder(userId: string): Promise<Order> {
    const cart = await this.cartService.getCartByUserId(userId);
    await this.cartService.validateCartStock(cart);

    const items: OrderItem[] = await this.cartService.getOrderItemsFromCart(cart);
    const totalPrice = await this.cartService.calculateCartTotal(cart);
    const reducedProductIds = cart.items.map((item) => getEntityId(item.productId));

    const order = await this.databaseTransactionService.executeInTransaction(
      async (session) => {
        for (const item of cart.items) {
          await this.productsService.reduceStock(
            getEntityId(item.productId),
            item.quantity,
            session,
            false,
          );
        }

        const createdOrder = await this.ordersRepository.create(
          {
            userId: new Types.ObjectId(userId),
            items,
            totalPrice,
            status: OrderStatus.PENDING,
          },
          session,
        );

        await this.cartService.clearCart(userId, session);

        return createdOrder;
      },
    );

    await Promise.all(
      reducedProductIds.map((productId) =>
        this.productsService.syncProductToSearch(productId),
      ),
    );

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

  private ensureValidObjectId(id: string, message: string): void {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(message);
    }
  }

  private isAdminRole(role: string): boolean {
    return role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
  }

}
