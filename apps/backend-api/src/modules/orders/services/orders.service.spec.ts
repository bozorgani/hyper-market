import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersRepository } from '../repositories/orders.repository';
import { ProductsService } from '../../products/services/products.service';
import { CartService } from '../../cart/services/cart.service';
import { CouponsService } from '../../coupons/coupons.service';
import { DatabaseTransactionService } from '../../../infrastructure/database/database-transaction.service';
import { EventBusService } from '../../../core/events/event-bus.service';
import { OrderStatus } from '../enums/order-status.enum';

const ORDER_ID = '507f1f77bcf86cd799439011';
const OTHER_ORDER_ID = '507f1f77bcf86cd799439012';

describe('OrdersService — cancellation idempotency (#4)', () => {
  let service: OrdersService;
  let ordersRepository: {
    findById: jest.Mock;
    updateStatus: jest.Mock;
    transitionStatus: jest.Mock;
  };
  let productsService: {
    getProductById: jest.Mock;
    reduceStock: jest.Mock;
    restoreStock: jest.Mock;
    syncProductToSearch: jest.Mock;
  };
  let databaseTransactionService: {
    executeInTransaction: jest.Mock;
  };

  const paidOrder = {
    _id: ORDER_ID,
    userId: 'user-1',
    status: OrderStatus.PAID,
    items: [
      { productId: 'product-1', quantity: 2 },
      { productId: 'product-2', quantity: 1 },
    ],
    totalPrice: 100,
  };

  beforeEach(async () => {
    ordersRepository = {
      findById: jest.fn().mockResolvedValue(paidOrder),
      updateStatus: jest.fn().mockResolvedValue({
        ...paidOrder,
        status: OrderStatus.PROCESSING,
      }),
      transitionStatus: jest.fn(),
    };
    productsService = {
      getProductById: jest.fn(),
      reduceStock: jest.fn(),
      restoreStock: jest.fn().mockResolvedValue({}),
      syncProductToSearch: jest.fn().mockResolvedValue(undefined),
    };
    databaseTransactionService = {
      // Run the callback without a real transaction (mirrors the unsupported
      // fast-path / simple passthrough for unit testing).
      executeInTransaction: jest.fn((cb) => cb(undefined)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: OrdersRepository, useValue: ordersRepository },
        { provide: ProductsService, useValue: productsService },
        { provide: CartService, useValue: {} },
        { provide: CouponsService, useValue: { validateCoupon: jest.fn() } },
        {
          provide: DatabaseTransactionService,
          useValue: databaseTransactionService,
        },
        { provide: EventBusService, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('restores stock exactly once on a successful cancellation', async () => {
    ordersRepository.transitionStatus.mockResolvedValue({
      ...paidOrder,
      status: OrderStatus.CANCELLED,
      cancelledAt: new Date(),
    });

    const result = await service.updateStatus(ORDER_ID, OrderStatus.CANCELLED);

    expect(ordersRepository.transitionStatus).toHaveBeenCalledWith(
      ORDER_ID,
      [OrderStatus.PENDING, OrderStatus.PAID, OrderStatus.PROCESSING],
      OrderStatus.CANCELLED,
      expect.objectContaining({ cancelledAt: expect.any(Date) }),
      undefined,
    );
    // One restore per line item, exactly once.
    expect(productsService.restoreStock).toHaveBeenCalledTimes(2);
    expect(productsService.restoreStock).toHaveBeenCalledWith(
      'product-1',
      2,
      undefined,
      false,
    );
    expect(productsService.restoreStock).toHaveBeenCalledWith(
      'product-2',
      1,
      undefined,
      false,
    );
    expect(productsService.syncProductToSearch).toHaveBeenCalledWith('product-1');
    expect(productsService.syncProductToSearch).toHaveBeenCalledWith('product-2');
    expect(result.status).toBe(OrderStatus.CANCELLED);
  });

  it('does NOT restore stock again when the order is already cancelled (idempotent)', async () => {
    let calls = 0;
    ordersRepository.transitionStatus.mockImplementation(async () => {
      calls += 1;
      // First call transitions; any subsequent call finds it already CANCELLED.
      return calls === 1
        ? { ...paidOrder, status: OrderStatus.CANCELLED, cancelledAt: new Date() }
        : null;
    });

    await service.updateStatus(ORDER_ID, OrderStatus.CANCELLED);
    await service.updateStatus(ORDER_ID, OrderStatus.CANCELLED);

    // restoreStock only ran during the first (effective) transition.
    expect(productsService.restoreStock).toHaveBeenCalledTimes(2);
  });

  it('re-reads and returns when the conditional transition matched nothing', async () => {
    ordersRepository.transitionStatus.mockResolvedValue(null);

    const result = await service.updateStatus(ORDER_ID, OrderStatus.CANCELLED);

    expect(productsService.restoreStock).not.toHaveBeenCalled();
    expect(result).toBe(paidOrder);
  });

  it('throws BadRequest for an illegal status transition', async () => {
    await expect(
      service.updateStatus(ORDER_ID, OrderStatus.DELIVERED),
    ).rejects.toThrow(BadRequestException);
    expect(ordersRepository.transitionStatus).not.toHaveBeenCalled();
    expect(productsService.restoreStock).not.toHaveBeenCalled();
  });

  it('forwards non-cancellation transitions to the repository', async () => {
    const result = await service.updateStatus(ORDER_ID, OrderStatus.PROCESSING);

    expect(ordersRepository.transitionStatus).not.toHaveBeenCalled();
    expect(ordersRepository.updateStatus).toHaveBeenCalledWith(
      ORDER_ID,
      OrderStatus.PROCESSING,
      undefined,
    );
    expect(result.status).toBe(OrderStatus.PROCESSING);
  });

  it('throws BadRequest when the order does not exist', async () => {
    ordersRepository.findById.mockResolvedValue(null);

    await expect(
      service.updateStatus(OTHER_ORDER_ID, OrderStatus.CANCELLED),
    ).rejects.toThrow(BadRequestException);
  });
});
