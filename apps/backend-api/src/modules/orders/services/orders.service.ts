import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isValidObjectId, Types } from 'mongoose';
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
  ) {}

  async createOrder(userId: string): Promise<Order> {
    const cart = await this.cartService.getCartByUserId(userId);
    await this.cartService.validateCartStock(cart);

    const items: OrderItem[] = await this.cartService.getOrderItemsFromCart(cart);
    const totalPrice = await this.cartService.calculateCartTotal(cart);
    const reducedItems: Array<{ productId: string; quantity: number }> = [];

    try {
      for (const item of cart.items) {
        const productId = getEntityId(item.productId);
        await this.productsService.reduceStock(productId, item.quantity);
        reducedItems.push({ productId, quantity: item.quantity });
      }

      const order = await this.ordersRepository.create({
        userId: new Types.ObjectId(userId),
        items,
        totalPrice,
        status: OrderStatus.PENDING,
      });

      await this.cartService.clearCart(userId);

      return order;
    } catch (error) {
      await Promise.all(
        reducedItems.map((item) =>
          this.productsService.restoreStock(item.productId, item.quantity),
        ),
      );
      throw error;
    }
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

  async updateStatus(orderId: string, status: OrderStatus): Promise<Order> {
    this.ensureValidObjectId(orderId, 'Invalid order id');

    const order = await this.ordersRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const allowedStatuses = ORDER_STATUS_TRANSITIONS[order.status];
    if (!allowedStatuses.includes(status)) {
      throw new BadRequestException('Invalid order status transition');
    }

    const updatedOrder = await this.ordersRepository.updateStatus(orderId, status);
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
