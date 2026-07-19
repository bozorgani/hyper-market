import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { OrdersController } from './orders.controller';
import { OrdersService } from '../services/orders.service';
import { IdempotencyService } from '../../../infrastructure/idempotency/idempotency.service';
import { PermissionsService } from '../../permissions/services/permissions.service';
import { AuditService } from '../../audit/audit.service';

const USER_SUB = 'user-123';
const ORDER_ID = '507f1f77bcf86cd799439011';

const mockOrder = {
  _id: ORDER_ID,
  userId: USER_SUB,
  status: 'PENDING',
  items: [{ productId: 'product-1', quantity: 1 }],
  totalPrice: 100000,
};

describe('OrdersController — idempotency', () => {
  let controller: OrdersController;
  let ordersService: { createOrder: jest.Mock };
  let idempotencyService: { execute: jest.Mock };
  let permissionsService: any;
  let auditService: any;

  beforeEach(async () => {
    ordersService = {
      createOrder: jest.fn(),
    };
    idempotencyService = {
      execute: jest.fn(),
    };
    permissionsService = {
      hasPermission: jest.fn().mockResolvedValue(true),
    };
    auditService = {
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        { provide: OrdersService, useValue: ordersService },
        { provide: IdempotencyService, useValue: idempotencyService },
        { provide: PermissionsService, useValue: permissionsService },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('first POST /orders with Idempotency-Key creates an order', async () => {
    ordersService.createOrder.mockResolvedValue(mockOrder);
    idempotencyService.execute.mockImplementation(async (_scope, _key, _payload, operation) => {
      const result = await operation();
      return { status: 'created', data: result };
    });

    const user = { sub: USER_SUB, role: 'CUSTOMER' } as any;
    const dto = {
      deliveryAddress: {
        recipientName: 'Test',
        phoneNumber: '09123456789',
        province: 'Tehran',
        city: 'Tehran',
        addressLine: 'Line 1',
      },
      deliveryWindow: {
        date: new Date(Date.now() + 86400000).toISOString(),
        timeSlot: '09:00-12:00',
      },
    };
    const res = { setHeader: jest.fn() } as any;

    const result = await controller.createOrder(user, dto as any, 'key-1', res);

    expect(idempotencyService.execute).toHaveBeenCalledWith(
      `orders:create:${USER_SUB}`,
      'key-1',
      expect.objectContaining({ userId: USER_SUB, role: 'CUSTOMER' }),
      expect.any(Function),
    );
    expect(ordersService.createOrder).toHaveBeenCalledWith(USER_SUB, dto);
    expect(result).toBe(mockOrder);
    expect(res.setHeader).toHaveBeenCalledWith('Idempotency-Status', 'created');
  });

  it('same request with same Idempotency-Key returns previous result', async () => {
    const replayedOrder = { ...mockOrder, _id: 'replayed-id' };
    idempotencyService.execute.mockResolvedValue({
      status: 'replayed',
      data: replayedOrder,
    });

    const user = { sub: USER_SUB, role: 'CUSTOMER' } as any;
    const dto = {
      deliveryAddress: {
        recipientName: 'Test',
        phoneNumber: '09123456789',
        province: 'Tehran',
        city: 'Tehran',
        addressLine: 'Line 1',
      },
      deliveryWindow: {
        date: new Date(Date.now() + 86400000).toISOString(),
        timeSlot: '09:00-12:00',
      },
    };
    const res = { setHeader: jest.fn() } as any;

    const result = await controller.createOrder(user, dto as any, 'key-1', res);

    expect(result).toBe(replayedOrder);
    expect(res.setHeader).toHaveBeenCalledWith('Idempotency-Status', 'replayed');
  });

  it('same Idempotency-Key does not create duplicate orders', async () => {
    const replayedOrder = { ...mockOrder, _id: 'replayed-id' };
    idempotencyService.execute.mockResolvedValue({
      status: 'replayed',
      data: replayedOrder,
    });

    const user = { sub: USER_SUB, role: 'CUSTOMER' } as any;
    const dto = {
      deliveryAddress: {
        recipientName: 'Test',
        phoneNumber: '09123456789',
        province: 'Tehran',
        city: 'Tehran',
        addressLine: 'Line 1',
      },
      deliveryWindow: {
        date: new Date(Date.now() + 86400000).toISOString(),
        timeSlot: '09:00-12:00',
      },
    };
    const res = { setHeader: jest.fn() } as any;

    const result = await controller.createOrder(user, dto as any, 'key-1', res);

    expect(ordersService.createOrder).not.toHaveBeenCalled();
    expect(result).toBe(replayedOrder);
  });

  it('different Idempotency-Key creates a separate order', async () => {
    ordersService.createOrder.mockResolvedValue(mockOrder);
    idempotencyService.execute.mockImplementation(async (_scope, _key, _payload, operation) => {
      const result = await operation();
      return { status: 'created', data: result };
    });

    const user = { sub: USER_SUB, role: 'CUSTOMER' } as any;
    const dto = {
      deliveryAddress: {
        recipientName: 'Test',
        phoneNumber: '09123456789',
        province: 'Tehran',
        city: 'Tehran',
        addressLine: 'Line 1',
      },
      deliveryWindow: {
        date: new Date(Date.now() + 86400000).toISOString(),
        timeSlot: '09:00-12:00',
      },
    };
    const res = { setHeader: jest.fn() } as any;

    await controller.createOrder(user, dto as any, 'key-2', res);
    await controller.createOrder(user, dto as any, 'key-3', res);

    expect(ordersService.createOrder).toHaveBeenCalledTimes(2);
    expect(idempotencyService.execute).toHaveBeenCalledTimes(2);
  });

  it('handles missing Idempotency-Key by creating order directly', async () => {
    ordersService.createOrder.mockResolvedValue(mockOrder);
    idempotencyService.execute.mockImplementation(async (_scope, key, _payload, operation) => {
      if (!key) {
        const result = await operation();
        return { status: 'created', data: result };
      }
      return operation();
    });

    const user = { sub: USER_SUB, role: 'CUSTOMER' } as any;
    const dto = {
      deliveryAddress: {
        recipientName: 'Test',
        phoneNumber: '09123456789',
        province: 'Tehran',
        city: 'Tehran',
        addressLine: 'Line 1',
      },
      deliveryWindow: {
        date: new Date(Date.now() + 86400000).toISOString(),
        timeSlot: '09:00-12:00',
      },
    };
    const res = { setHeader: jest.fn() } as any;

    const result = await controller.createOrder(user, dto as any, undefined, res);

    expect(ordersService.createOrder).toHaveBeenCalled();
    expect(result).toBe(mockOrder);
  });
});
