import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersRepository } from '../repositories/orders.repository';
import { ProductsService } from '../../products/services/products.service';
import { ShippingService } from '../../shipping/shipping.service';
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
    create: jest.Mock;
    findByUserId: jest.Mock;
    findRecentPendingByUserId: jest.Mock;
  };
  let productsService: {
    getProductById: jest.Mock;
    reduceStock: jest.Mock;
    restoreStock: jest.Mock;
    syncProductToSearch: jest.Mock;
  };
  let cartService: {
    getCartByUserId: jest.Mock;
    clearCart: jest.Mock;
  };
  let couponsService: {
    validateCoupon: jest.Mock;
    recordUsage: jest.Mock;
  };
  let shippingService: {
    getQuote: jest.Mock;
    getCapacityForWindow: jest.Mock;
  };
  let databaseTransactionService: {
    executeInTransaction: jest.Mock;
    executeWithCompensation: jest.Mock;
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
      create: jest.fn(),
      findByUserId: jest.fn(),
      findRecentPendingByUserId: jest.fn().mockResolvedValue(null),
    };
    productsService = {
      getProductById: jest.fn(),
      reduceStock: jest.fn(),
      restoreStock: jest.fn().mockResolvedValue({}),
      syncProductToSearch: jest.fn().mockResolvedValue(undefined),
    };
    cartService = {
      getCartByUserId: jest.fn(),
      clearCart: jest.fn(),
    };
    couponsService = {
      validateCoupon: jest.fn(),
      recordUsage: jest.fn(),
    };
    shippingService = {
      getQuote: jest.fn(),
      getCapacityForWindow: jest.fn(),
    };
    databaseTransactionService = {
      executeInTransaction: jest.fn((cb) => cb(undefined)),
      executeWithCompensation: jest.fn(({ execute }) => execute(undefined)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: OrdersRepository, useValue: ordersRepository },
        { provide: ProductsService, useValue: productsService },
        { provide: CartService, useValue: cartService },
        { provide: CouponsService, useValue: couponsService },
        { provide: ShippingService, useValue: shippingService },
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

describe('OrdersService — createOrder', () => {
  let service: OrdersService;
  let ordersRepository: any;
  let productsService: any;
  let cartService: any;
  let couponsService: any;
  let shippingService: any;
  let databaseTransactionService: any;

  beforeEach(async () => {
    ordersRepository = {
      create: jest.fn(),
      findByUserId: jest.fn(),
      findById: jest.fn(),
      findRecentPendingByUserId: jest.fn().mockResolvedValue(null),
      countActiveByDeliveryWindow: jest.fn().mockResolvedValue(0),
    };
    productsService = {
      getProductById: jest.fn(),
      reduceStock: jest.fn(),
      syncProductToSearch: jest.fn(),
    };
    cartService = {
      getCartByUserId: jest.fn(),
      clearCart: jest.fn(),
    };
    couponsService = {
      validateCoupon: jest.fn(),
      recordUsage: jest.fn(),
    };
    shippingService = {
      getQuote: jest.fn(),
      getCapacityForWindow: jest.fn(),
    };
    databaseTransactionService = {
      executeWithCompensation: jest.fn(({ execute }) => execute(undefined)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: OrdersRepository, useValue: ordersRepository },
        { provide: ProductsService, useValue: productsService },
        { provide: CartService, useValue: cartService },
        { provide: CouponsService, useValue: couponsService },
        { provide: ShippingService, useValue: shippingService },
        { provide: DatabaseTransactionService, useValue: databaseTransactionService },
        { provide: EventBusService, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create order successfully with valid cart', async () => {
    const mockCart = {
      items: [
        { productId: { _id: '507f1f77bcf86cd799439011' }, quantity: 2 },
        { productId: { _id: '507f1f77bcf86cd799439012' }, quantity: 1 },
      ],
    };

    const mockProducts = [
      {
        _id: '507f1f77bcf86cd799439011',
        name: 'Product 1',
        price: 50000,
        stock: 10,
        isActive: true,
      },
      {
        _id: '507f1f77bcf86cd799439012',
        name: 'Product 2',
        price: 30000,
        stock: 5,
        isActive: true,
      },
    ];

    const mockOrder = {
      _id: ORDER_ID,
      userId: 'user-1',
      status: OrderStatus.PENDING,
      items: mockCart.items,
      totalPrice: 130000,
    };

    cartService.getCartByUserId.mockResolvedValue(mockCart);
    productsService.getProductById
      .mockResolvedValueOnce(mockProducts[0])
      .mockResolvedValueOnce(mockProducts[1]);
    productsService.reduceStock.mockResolvedValue({});
    shippingService.getQuote.mockReturnValue({
      method: 'standard',
      deliveryFee: 30000,
      freeShippingApplied: false,
      freeShippingThreshold: 500000,
      capacity: 50,
    });
    ordersRepository.create.mockResolvedValue(mockOrder);
    ordersRepository.countActiveByDeliveryWindow.mockResolvedValue(0);
    cartService.clearCart.mockResolvedValue({});

    const result = await service.createOrder('507f1f77bcf86cd799439013', {
      deliveryAddress: {
        recipientName: 'Test User',
        phoneNumber: '09123456789',
        province: 'Tehran',
        city: 'Tehran',
        addressLine: 'Test Address',
        postalCode: '1234567890',
      },
      deliveryWindow: {
        date: new Date(Date.now() + 86400000).toISOString(),
        timeSlot: '09:00-12:00',
      },
    });

    expect(result).toBeDefined();
    expect(ordersRepository.create).toHaveBeenCalled();
    expect(productsService.reduceStock).toHaveBeenCalledTimes(2);
    expect(cartService.clearCart).toHaveBeenCalledWith('507f1f77bcf86cd799439013', undefined);
  });

  it('should throw BadRequestException when cart is empty', async () => {
    cartService.getCartByUserId.mockResolvedValue({ items: [] });

    await expect(
      service.createOrder('user-1', {
        deliveryAddress: {
          recipientName: 'Test User',
          phoneNumber: '09123456789',
          province: 'Tehran',
          city: 'Tehran',
          addressLine: 'Test Address',
        },
        deliveryWindow: {
          date: new Date(Date.now() + 86400000).toISOString(),
          timeSlot: '09:00-12:00',
        },
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException when product is inactive', async () => {
    const mockCart = {
      items: [{ productId: { _id: 'product-1' }, quantity: 1 }],
    };

    const mockProduct = {
      _id: 'product-1',
      name: 'Product 1',
      price: 50000,
      stock: 10,
      isActive: false,
    };

    cartService.getCartByUserId.mockResolvedValue(mockCart);
    productsService.getProductById.mockResolvedValue(mockProduct);

    await expect(
      service.createOrder('user-1', {
        deliveryAddress: {
          recipientName: 'Test User',
          phoneNumber: '09123456789',
          province: 'Tehran',
          city: 'Tehran',
          addressLine: 'Test Address',
        },
        deliveryWindow: {
          date: new Date(Date.now() + 86400000).toISOString(),
          timeSlot: '09:00-12:00',
        },
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException when stock is insufficient', async () => {
    const mockCart = {
      items: [{ productId: { _id: 'product-1' }, quantity: 10 }],
    };

    const mockProduct = {
      _id: 'product-1',
      name: 'Product 1',
      price: 50000,
      stock: 5,
      isActive: true,
    };

    cartService.getCartByUserId.mockResolvedValue(mockCart);
    productsService.getProductById.mockResolvedValue(mockProduct);

    await expect(
      service.createOrder('user-1', {
        deliveryAddress: {
          recipientName: 'Test User',
          phoneNumber: '09123456789',
          province: 'Tehran',
          city: 'Tehran',
          addressLine: 'Test Address',
        },
        deliveryWindow: {
          date: new Date(Date.now() + 86400000).toISOString(),
          timeSlot: '09:00-12:00',
        },
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should apply coupon discount when valid coupon is provided', async () => {
    const mockCart = {
      items: [{ productId: { _id: '507f1f77bcf86cd799439011' }, quantity: 2 }],
    };

    const mockProduct = {
      _id: '507f1f77bcf86cd799439011',
      name: 'Product 1',
      price: 50000,
      stock: 10,
      isActive: true,
    };

    const mockCoupon = {
      couponId: 'coupon-1',
      code: 'SAVE10',
      percent: 10,
      discountAmount: 10000,
      total: 90000,
    };

    cartService.getCartByUserId.mockResolvedValue(mockCart);
    productsService.getProductById.mockResolvedValue(mockProduct);
    productsService.reduceStock.mockResolvedValue({});
    couponsService.validateCoupon.mockResolvedValue(mockCoupon);
    shippingService.getQuote.mockReturnValue({
      method: 'standard',
      deliveryFee: 30000,
      freeShippingApplied: false,
      capacity: 50,
    });
    ordersRepository.create.mockResolvedValue({
      _id: ORDER_ID,
      status: OrderStatus.PENDING,
      totalPrice: 120000,
      items: [{ productId: '507f1f77bcf86cd799439011', quantity: 2 }],
      couponCode: 'SAVE10',
      discountAmount: 10000,
      subtotalPrice: 100000,
      deliveryFee: 30000,
      shippingMethod: 'standard',
    });
    ordersRepository.countActiveByDeliveryWindow.mockResolvedValue(0);
    cartService.clearCart.mockResolvedValue({});

    await service.createOrder('507f1f77bcf86cd799439013', {
      deliveryAddress: {
        recipientName: 'Test User',
        phoneNumber: '09123456789',
        province: 'Tehran',
        city: 'Tehran',
        addressLine: 'Test Address',
      },
      deliveryWindow: {
        date: new Date(Date.now() + 86400000).toISOString(),
        timeSlot: '09:00-12:00',
      },
      couponCode: 'SAVE10',
    });

    expect(couponsService.validateCoupon).toHaveBeenCalledWith('SAVE10', 100000, 'user-1');
    expect(ordersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        discountAmount: 10000,
        couponCode: 'SAVE10',
      }),
      undefined,
    );
  });
});

describe('OrdersService — getMyOrders and getOrderById', () => {
  let service: OrdersService;
  let ordersRepository: any;

  beforeEach(async () => {
    ordersRepository = {
      findByUserId: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: OrdersRepository, useValue: ordersRepository },
        { provide: ProductsService, useValue: {} },
        { provide: CartService, useValue: {} },
        { provide: CouponsService, useValue: {} },
        { provide: ShippingService, useValue: {} },
        { provide: DatabaseTransactionService, useValue: {} },
        { provide: EventBusService, useValue: {} },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return orders for a user', async () => {
    const mockOrders = [
      { _id: 'order-1', userId: 'user-1', status: OrderStatus.PENDING },
      { _id: 'order-2', userId: 'user-1', status: OrderStatus.PAID },
    ];

    ordersRepository.findByUserId.mockResolvedValue(mockOrders);

    const result = await service.getMyOrders('user-1');

    expect(result).toEqual(mockOrders);
    expect(ordersRepository.findByUserId).toHaveBeenCalledWith('user-1');
  });

  it('should return order by ID for the owner', async () => {
    const mockOrder = {
      _id: ORDER_ID,
      userId: 'user-1',
      status: OrderStatus.PENDING,
    };

    ordersRepository.findById.mockResolvedValue(mockOrder);

    const result = await service.getOrderById(ORDER_ID, 'user-1', 'CUSTOMER');

    expect(result).toEqual(mockOrder);
    expect(ordersRepository.findById).toHaveBeenCalledWith(ORDER_ID);
  });

  it('should throw ForbiddenException when user tries to access another user order', async () => {
    const mockOrder = {
      _id: ORDER_ID,
      userId: 'user-2',
      status: OrderStatus.PENDING,
    };

    ordersRepository.findById.mockResolvedValue(mockOrder);

    await expect(
      service.getOrderById(ORDER_ID, 'user-1', 'CUSTOMER'),
    ).rejects.toThrow();
  });

  it('should allow admin to access any order', async () => {
    const mockOrder = {
      _id: ORDER_ID,
      userId: 'user-2',
      status: OrderStatus.PENDING,
    };

    ordersRepository.findById.mockResolvedValue(mockOrder);

    const result = await service.getOrderById(ORDER_ID, 'user-1', 'admin');

    expect(result).toEqual(mockOrder);
  });

  it('should throw BadRequestException when order not found', async () => {
    ordersRepository.findById.mockResolvedValue(null);

    await expect(
      service.getOrderById(ORDER_ID, 'user-1', 'CUSTOMER'),
    ).rejects.toThrow(BadRequestException);
  });
});
