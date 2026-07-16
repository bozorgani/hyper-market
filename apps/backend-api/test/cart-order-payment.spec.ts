import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CartService } from '../src/modules/cart/services/cart.service';
import { OrdersService } from '../src/modules/orders/services/orders.service';
import { OrderStatus } from '../src/modules/orders/enums/order-status.enum';
import { PaymentsService } from '../src/modules/payments/services/payments.service';
import { PaymentStatus } from '../src/modules/payments/enums/payment-status.enum';
import { PaymentMethod } from '../src/modules/payments/enums/payment-method.enum';

function createProduct(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    _id: new Types.ObjectId(),
    name: 'Test Product',
    description: 'Test product description',
    price: 100,
    discountPrice: null,
    stock: 10,
    images: ['image.jpg'],
    isActive: true,
    ...overrides,
  };
}

function createCart(productId = new Types.ObjectId(), quantity = 2) {
  return {
    _id: new Types.ObjectId(),
    userId: new Types.ObjectId(),
    items: [{ productId, quantity }],
  };
}

describe('Cart, Order, and Payment Flows', () => {
  it('CartService returns detailed cart items and total price', async () => {
    const productId = new Types.ObjectId();
    const cart = createCart(productId, 3);
    const product = createProduct({ _id: productId, price: 200, discountPrice: 150, stock: 8 });

    const cartRepository = {
      getCartByUserId: async () => cart,
    };
    const productsService = {
      getProductById: async () => product,
      getProductsByIds: async () => [product],
    };
    const service = new CartService(cartRepository as never, productsService as never);

    const summary = await service.getCartSummary(new Types.ObjectId().toHexString());

    expect(summary.totalPrice).toBe(450);
    expect(summary.items.length).toBe(1);
    expect(summary.items[0].name).toBe(product.name);
    expect(summary.items[0].price).toBe(150);
    expect(summary.items[0].lineTotal).toBe(450);
  });

  it('CartService rejects adding product when stock is insufficient', async () => {
    const product = createProduct({ stock: 1 });
    const cartRepository = {
      getCartByUserId: async () => createCart(),
    };
    const productsService = {
      getProductById: async () => product,
    };
    const service = new CartService(cartRepository as never, productsService as never);

    await expect(
      service.addProductToCart(new Types.ObjectId().toHexString(), new Types.ObjectId().toHexString(), 2),
    ).rejects.toThrow(BadRequestException);
  });

  it('OrdersService creates order inside transaction and clears cart', async () => {
    const userId = new Types.ObjectId().toHexString();
    const productId = new Types.ObjectId();
    const cart = createCart(productId, 2);
    const order = {
      _id: new Types.ObjectId(),
      userId: new Types.ObjectId(userId),
      items: [],
      totalPrice: 200,
      status: OrderStatus.PENDING,
    };
    const calls: string[] = [];

    const ordersRepository = {
      findRecentPendingByUserId: async () => null,
      countActiveByDeliveryWindow: async () => 0,
      create: async (_data: unknown, session: unknown) => {
        expect(session).toBe('session');
        calls.push('create-order');
        return order;
      },
    };
    const productsService = {
      getProductById: async (_id: string, session: unknown) => {
        expect(session).toBe('session');
        calls.push('get-product');
        return createProduct({ _id: productId });
      },
      reduceStock: async (_id: string, _quantity: number, session: unknown, syncSearch: boolean) => {
        expect(session).toBe('session');
        expect(syncSearch).toBe(false);
        calls.push('reduce-stock');
        return createProduct({ _id: productId });
      },
      syncProductToSearch: async () => {
        calls.push('sync-search');
      },
    };
    const cartService = {
      getCartByUserId: async (_userId: string, session: unknown) => {
        expect(session).toBe('session');
        return cart;
      },
      clearCart: async (_userId: string, session: unknown) => {
        expect(session).toBe('session');
        calls.push('clear-cart');
        return cart;
      },
    };
    const transactionService = {
      executeWithCompensation: async (options: { execute: (session: unknown) => Promise<unknown> }) => {
        calls.push('transaction-start');
        const result = await options.execute('session');
        calls.push('transaction-end');
        return result;
      },
    };

    const redisService = {
      setIfNotExists: async () => true,
      delete: async () => {},
    };

    const service = new OrdersService(
      ordersRepository as never,
      productsService as never,
      cartService as never,
      { validateCoupon: () => null } as never,
      { getQuote: () => ({ method: 'standard', deliveryFee: 0, freeShippingApplied: false, capacity: 50 }) } as never,
      transactionService as never,
      redisService as never,
    );

    const result = await service.createOrder(userId, {
      deliveryAddress: {
        recipientName: 'Test User',
        phoneNumber: '09123456789',
        province: 'Tehran',
        city: 'Tehran',
        addressLine: 'Test address line',
      },
      deliveryWindow: {
        date: new Date().toISOString(),
        timeSlot: '09:00-12:00',
      },
    });

    expect(result).toBe(order);
    expect(calls).toEqual([
      'transaction-start',
      'get-product',
      'reduce-stock',
      'create-order',
      'clear-cart',
      'transaction-end',
      'sync-search',
    ]);
  });

  it('OrdersService restores stock when order is cancelled', async () => {
    const orderId = new Types.ObjectId().toHexString();
    const productId = new Types.ObjectId();
    const order = {
      _id: new Types.ObjectId(orderId),
      userId: new Types.ObjectId(),
      items: [{ productId, quantity: 2, priceAtPurchase: 100 }],
      totalPrice: 200,
      status: OrderStatus.PAID,
    };
    const cancelledOrder = { ...order, status: OrderStatus.CANCELLED };
    const calls: string[] = [];

    const ordersRepository = {
      findById: async () => order,
      transitionStatus: async (_orderId: string, _from: OrderStatus[], to: OrderStatus, _update: unknown, session: unknown) => {
        expect(to).toBe(OrderStatus.CANCELLED);
        expect(session).toBe('session');
        calls.push('cancel-order');
        return cancelledOrder;
      },
      updateStatus: async (_orderId: string, status: OrderStatus, session: unknown) => {
        expect(status).toBe(OrderStatus.CANCELLED);
        expect(session).toBe('session');
        calls.push('cancel-order');
        return cancelledOrder;
      },
    };
    const productsService = {
      restoreStock: async (_id: string, quantity: number, session: unknown, syncSearch: boolean) => {
        expect(quantity).toBe(2);
        expect(session).toBe('session');
        expect(syncSearch).toBe(false);
        calls.push('restore-stock');
        return createProduct({ _id: productId });
      },
      syncProductToSearch: async () => {
        calls.push('sync-search');
      },
    };
    const transactionService = {
      executeInTransaction: async (callback: (session: unknown) => Promise<unknown>) => {
        calls.push('transaction-start');
        const result = await callback('session');
        calls.push('transaction-end');
        return result;
      },
      executeWithCompensation: async (options: { execute: (session: unknown) => Promise<unknown> }) => {
        calls.push('transaction-start');
        const result = await options.execute('session');
        calls.push('transaction-end');
        return result;
      },
    };

    const service = new OrdersService(
      ordersRepository as never,
      productsService as never,
      {} as never,
      { validateCoupon: () => null } as never,
      { getQuote: () => ({ method: 'standard', deliveryFee: 0, freeShippingApplied: false, capacity: 50 }) } as never,
      transactionService as never,
      { setIfNotExists: async () => true, delete: async () => {} } as never,
    );

    const result = await service.updateStatus(orderId, OrderStatus.CANCELLED);

    expect(result).toBe(cancelledOrder);
    expect(calls).toEqual([
      'transaction-start',
      'cancel-order',
      'restore-stock',
      'transaction-end',
      'sync-search',
    ]);
  });

  it('PaymentsService COD auto-confirms payment and updates order status inside transaction', async () => {
    const userId = new Types.ObjectId().toHexString();
    const orderId = new Types.ObjectId().toHexString();
    const calls: string[] = [];
    const codPayment = {
      _id: new Types.ObjectId(),
      orderId: new Types.ObjectId(orderId),
      userId: new Types.ObjectId(userId),
      amount: 300,
      status: PaymentStatus.PAID,
      method: PaymentMethod.COD,
      transactionId: 'cod_test-tx',
    };

    const paymentsRepository = {
      findByOrderId: async () => null,
      findPendingByOrderId: async () => null,
      create: async (data: Record<string, unknown>) => {
        expect(data.status).toBe(PaymentStatus.PAID);
        expect(data.method).toBe('cod');
        calls.push('create-payment');
        return codPayment;
      },
    };
    const ordersService = {
      getOrderById: async () => ({
        _id: new Types.ObjectId(orderId),
        userId: new Types.ObjectId(userId),
        totalPrice: 300,
        status: OrderStatus.PENDING,
        items: [],
      }),
      updateStatus: async (_orderId: string, status: OrderStatus, session: unknown) => {
        expect(status).toBe(OrderStatus.PAID);
        expect(session).toBe('session');
        calls.push('update-order');
        return { status };
      },
    };
    const transactionService = {
      executeWithCompensation: async (options: { execute: (session: unknown) => Promise<unknown> }) => {
        calls.push('transaction-start');
        const result = await options.execute('session');
        calls.push('transaction-end');
        return result;
      },
    };

    const service = new PaymentsService(
      paymentsRepository as never,
      ordersService as never,
      transactionService as never,
      { setIfNotExists: async () => true, delete: async () => {} } as never,
    );

    const result = await service.createPaymentFromOrder(userId, 'customer', { orderId, method: PaymentMethod.COD });

    expect(result).toBe(codPayment);
    expect(calls).toEqual(['transaction-start', 'create-payment', 'update-order', 'transaction-end']);
  });
});
