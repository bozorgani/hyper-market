import test from 'node:test';
import assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CartService } from '../src/modules/cart/services/cart.service';
import { OrdersService } from '../src/modules/orders/services/orders.service';
import { OrderStatus } from '../src/modules/orders/enums/order-status.enum';
import { PaymentsService } from '../src/modules/payments/services/payments.service';
import { PaymentStatus } from '../src/modules/payments/enums/payment-status.enum';

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

test('CartService returns detailed cart items and total price', async () => {
  const productId = new Types.ObjectId();
  const cart = createCart(productId, 3);
  const product = createProduct({ _id: productId, price: 200, discountPrice: 150, stock: 8 });

  const cartRepository = {
    getCartByUserId: async () => cart,
  };
  const productsService = {
    getProductById: async () => product,
  };
  const service = new CartService(cartRepository as never, productsService as never);

  const summary = await service.getCartSummary(new Types.ObjectId().toHexString());

  assert.equal(summary.totalPrice, 450);
  assert.equal(summary.items.length, 1);
  assert.equal(summary.items[0].name, product.name);
  assert.equal(summary.items[0].price, 150);
  assert.equal(summary.items[0].lineTotal, 450);
});

test('CartService rejects adding product when stock is insufficient', async () => {
  const product = createProduct({ stock: 1 });
  const cartRepository = {
    getCartByUserId: async () => createCart(),
  };
  const productsService = {
    getProductById: async () => product,
  };
  const service = new CartService(cartRepository as never, productsService as never);

  await assert.rejects(
    () => service.addProductToCart(new Types.ObjectId().toHexString(), new Types.ObjectId().toHexString(), 2),
    BadRequestException,
  );
});

test('OrdersService creates order inside transaction and clears cart', async () => {
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
    create: async (_data: unknown, session: unknown) => {
      assert.equal(session, 'session');
      calls.push('create-order');
      return order;
    },
  };
  const productsService = {
    reduceStock: async (_id: string, _quantity: number, session: unknown, syncSearch: boolean) => {
      assert.equal(session, 'session');
      assert.equal(syncSearch, false);
      calls.push('reduce-stock');
      return createProduct({ _id: productId });
    },
    syncProductToSearch: async () => {
      calls.push('sync-search');
    },
  };
  const cartService = {
    getCartByUserId: async () => cart,
    validateCartStock: async () => calls.push('validate-cart'),
    getOrderItemsFromCart: async () => [
      { productId, quantity: 2, priceAtPurchase: 100 },
    ],
    calculateCartTotal: async () => 200,
    clearCart: async (_userId: string, session: unknown) => {
      assert.equal(session, 'session');
      calls.push('clear-cart');
      return cart;
    },
  };
  const transactionService = {
    executeInTransaction: async (callback: (session: unknown) => Promise<unknown>) => {
      calls.push('transaction-start');
      const result = await callback('session');
      calls.push('transaction-end');
      return result;
    },
  };

  const service = new OrdersService(
    ordersRepository as never,
    productsService as never,
    cartService as never,
    transactionService as never,
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

  assert.equal(result, order);
  assert.deepEqual(calls, [
    'validate-cart',
    'transaction-start',
    'reduce-stock',
    'create-order',
    'clear-cart',
    'transaction-end',
    'sync-search',
  ]);
});

test('OrdersService restores stock when order is cancelled', async () => {
  const orderId = new Types.ObjectId().toHexString();
  const productId = new Types.ObjectId();
  const order = {
    _id: new Types.ObjectId(orderId),
    userId: new Types.ObjectId(),
    items: [{ productId, quantity: 2, priceAtPurchase: 100 }],
    totalPrice: 200,
    status: OrderStatus.PENDING,
  };
  const cancelledOrder = { ...order, status: OrderStatus.CANCELLED };
  const calls: string[] = [];

  const ordersRepository = {
    findById: async () => order,
    updateStatus: async (_orderId: string, status: OrderStatus, session: unknown) => {
      assert.equal(status, OrderStatus.CANCELLED);
      assert.equal(session, 'session');
      calls.push('cancel-order');
      return cancelledOrder;
    },
  };
  const productsService = {
    restoreStock: async (_id: string, quantity: number, session: unknown, syncSearch: boolean) => {
      assert.equal(quantity, 2);
      assert.equal(session, 'session');
      assert.equal(syncSearch, false);
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
  };

  const service = new OrdersService(
    ordersRepository as never,
    productsService as never,
    {} as never,
    transactionService as never,
  );

  const result = await service.updateStatus(orderId, OrderStatus.CANCELLED);

  assert.equal(result, cancelledOrder);
  assert.deepEqual(calls, [
    'transaction-start',
    'restore-stock',
    'cancel-order',
    'transaction-end',
    'sync-search',
  ]);
});

test('PaymentsService marks payment paid and updates order status inside transaction', async () => {
  const userId = new Types.ObjectId().toHexString();
  const orderId = new Types.ObjectId().toHexString();
  const payment = {
    _id: new Types.ObjectId(),
    orderId: new Types.ObjectId(orderId),
    userId: new Types.ObjectId(userId),
    amount: 300,
    status: PaymentStatus.PENDING,
  };
  const paidPayment = { ...payment, status: PaymentStatus.PAID, transactionId: 'tx_1' };
  const calls: string[] = [];

  const paymentsRepository = {
    findByOrderId: async () => payment,
    markAsPaid: async (_id: string, transactionId: string, session: unknown) => {
      assert.equal(transactionId, 'tx_1');
      assert.equal(session, 'session');
      calls.push('mark-paid');
      return paidPayment;
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
      assert.equal(status, OrderStatus.PAID);
      assert.equal(session, 'session');
      calls.push('update-order');
      return { status };
    },
  };
  const transactionService = {
    executeInTransaction: async (callback: (session: unknown) => Promise<unknown>) => {
      calls.push('transaction-start');
      const result = await callback('session');
      calls.push('transaction-end');
      return result;
    },
  };

  const service = new PaymentsService(
    paymentsRepository as never,
    ordersService as never,
    transactionService as never,
  );

  const result = await service.simulatePaymentSuccess(userId, 'customer', orderId, 'tx_1');

  assert.equal(result, paidPayment);
  assert.deepEqual(calls, ['transaction-start', 'mark-paid', 'update-order', 'transaction-end']);
});
