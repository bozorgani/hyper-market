import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { PaymentsService } from './payments.service';
import { PaymentsRepository } from '../repositories/payments.repository';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { OrdersService } from '../../orders/services/orders.service';
import { DatabaseTransactionService } from '../../../infrastructure/database/database-transaction.service';
import { EventBusService } from '../../../core/events/event-bus.service';
import { OrderStatus } from '../../orders/enums/order-status.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentMethod } from '../enums/payment-method.enum';
import { UserRole } from '../../users/enums/user-role.enum';

const ORDER_ID = new Types.ObjectId().toHexString();
const USER_ID = new Types.ObjectId().toHexString();
const PAYMENT_ID = new Types.ObjectId().toHexString();

const mockPendingOrder = {
  _id: ORDER_ID,
  userId: new Types.ObjectId(USER_ID),
  totalPrice: 500,
  status: OrderStatus.PENDING,
  items: [],
};

const mockPaidPayment = {
  _id: PAYMENT_ID,
  orderId: new Types.ObjectId(ORDER_ID),
  userId: new Types.ObjectId(USER_ID),
  amount: 500,
  status: PaymentStatus.PAID,
  method: PaymentMethod.COD,
  transactionId: 'cod_test-tx',
};

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentsRepository: {
    findByOrderId: jest.Mock;
    findPendingByOrderId: jest.Mock;
    create: jest.Mock;
    markAsFailed: jest.Mock;
    findByOrderIds: jest.Mock;
  };
  let ordersService: {
    getOrderById: jest.Mock;
    updateStatus: jest.Mock;
  };
  let databaseTransactionService: {
    executeWithCompensation: jest.Mock;
  };

  beforeEach(async () => {
    paymentsRepository = {
      findByOrderId: jest.fn().mockResolvedValue(null),
      findPendingByOrderId: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(mockPaidPayment),
      markAsFailed: jest.fn().mockResolvedValue(null),
      findByOrderIds: jest.fn().mockResolvedValue([]),
    };
    ordersService = {
      getOrderById: jest.fn().mockResolvedValue(mockPendingOrder),
      updateStatus: jest.fn().mockResolvedValue({ status: OrderStatus.PAID }),
    };
    databaseTransactionService = {
      executeWithCompensation: jest.fn((opts) => opts.execute(undefined)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PaymentsRepository, useValue: paymentsRepository },
        { provide: OrdersService, useValue: ordersService },
        { provide: DatabaseTransactionService, useValue: databaseTransactionService },
        { provide: EventBusService, useValue: { emit: jest.fn() } },
        { provide: RedisService, useValue: { setIfNotExists: jest.fn().mockResolvedValue(true), delete: jest.fn() } },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── createPaymentFromOrder ────────────────────────────────────────
  describe('createPaymentFromOrder', () => {
    it('should throw BadRequestException for invalid orderId', async () => {
      await expect(
        service.createPaymentFromOrder(USER_ID, UserRole.CUSTOMER, { orderId: 'bad' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when order is not pending', async () => {
      ordersService.getOrderById.mockResolvedValue({ ...mockPendingOrder, status: OrderStatus.PAID });

      await expect(
        service.createPaymentFromOrder(USER_ID, UserRole.CUSTOMER, { orderId: ORDER_ID }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when order is already paid', async () => {
      paymentsRepository.findByOrderId.mockResolvedValue({
        ...mockPaidPayment,
        status: PaymentStatus.PAID,
      });

      await expect(
        service.createPaymentFromOrder(USER_ID, UserRole.CUSTOMER, { orderId: ORDER_ID }),
      ).rejects.toThrow('Order is already paid');
    });

    it('should return existing pending payment if one exists', async () => {
      const pendingPayment = { ...mockPaidPayment, status: PaymentStatus.PENDING };
      paymentsRepository.findPendingByOrderId.mockResolvedValue(pendingPayment);

      const result = await service.createPaymentFromOrder(USER_ID, UserRole.CUSTOMER, {
        orderId: ORDER_ID,
      });

      expect(result).toBe(pendingPayment);
      expect(paymentsRepository.create).not.toHaveBeenCalled();
    });

    it('should create COD payment and transition order to PAID', async () => {
      const result = await service.createPaymentFromOrder(USER_ID, UserRole.CUSTOMER, {
        orderId: ORDER_ID,
        method: PaymentMethod.COD,
      });

      expect(result).toBe(mockPaidPayment);
      expect(databaseTransactionService.executeWithCompensation).toHaveBeenCalled();
      expect(paymentsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PaymentStatus.PAID,
          method: PaymentMethod.COD,
        }),
      );
    });

    it('should create PENDING payment for online gateway', async () => {
      const pendingPayment = { ...mockPaidPayment, status: PaymentStatus.PENDING, method: PaymentMethod.ZARINPAL };
      paymentsRepository.create.mockResolvedValue(pendingPayment);

      const result = await service.createPaymentFromOrder(USER_ID, UserRole.CUSTOMER, {
        orderId: ORDER_ID,
        method: PaymentMethod.ZARINPAL,
      });

      expect(result.status).toBe(PaymentStatus.PENDING);
      expect(paymentsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PaymentStatus.PENDING,
          method: PaymentMethod.ZARINPAL,
        }),
      );
    });
  });

  // ── verifyPayment ─────────────────────────────────────────────────
  describe('verifyPayment', () => {
    it('should throw NotFoundException when payment not found', async () => {
      paymentsRepository.findByOrderId.mockResolvedValue(null);

      await expect(
        service.verifyPayment(ORDER_ID, USER_ID, UserRole.CUSTOMER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when non-admin tries to access another user payment', async () => {
      const otherUserId = new Types.ObjectId().toHexString();
      paymentsRepository.findByOrderId.mockResolvedValue({
        ...mockPaidPayment,
        userId: new Types.ObjectId(otherUserId),
      });

      await expect(
        service.verifyPayment(ORDER_ID, USER_ID, UserRole.CUSTOMER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return payment for admin regardless of ownership', async () => {
      const otherUserId = new Types.ObjectId().toHexString();
      paymentsRepository.findByOrderId.mockResolvedValue({
        ...mockPaidPayment,
        userId: new Types.ObjectId(otherUserId),
      });

      const result = await service.verifyPayment(ORDER_ID, USER_ID, UserRole.ADMIN);
      expect(result).toBeDefined();
    });
  });

  // ── findPaymentsByOrderIds ────────────────────────────────────────
  describe('findPaymentsByOrderIds', () => {
    it('should return empty array for empty input', async () => {
      const result = await service.findPaymentsByOrderIds([], USER_ID, UserRole.ADMIN);
      expect(result).toEqual([]);
    });

    it('should filter payments by userId for non-admin users', async () => {
      const otherUserId = new Types.ObjectId().toHexString();
      paymentsRepository.findByOrderIds.mockResolvedValue([
        { ...mockPaidPayment, userId: new Types.ObjectId(USER_ID) },
        { ...mockPaidPayment, userId: new Types.ObjectId(otherUserId) },
      ]);

      const result = await service.findPaymentsByOrderIds([ORDER_ID], USER_ID, UserRole.CUSTOMER);
      expect(result).toHaveLength(1);
    });

    it('should return all payments for admin', async () => {
      const otherUserId = new Types.ObjectId().toHexString();
      paymentsRepository.findByOrderIds.mockResolvedValue([
        { ...mockPaidPayment, userId: new Types.ObjectId(USER_ID) },
        { ...mockPaidPayment, userId: new Types.ObjectId(otherUserId) },
      ]);

      const result = await service.findPaymentsByOrderIds([ORDER_ID], USER_ID, UserRole.ADMIN);
      expect(result).toHaveLength(2);
    });
  });
});
