import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { UsersService } from './users.service';
import { UsersRepository } from '../repositories/users.repository';
import { UserRole } from '../enums/user-role.enum';
import { AccountStatus } from '../enums/account-status.enum';
import { User } from '../schemas/user.schema';

const USER_ID = new Types.ObjectId().toHexString();
const INVALID_ID = 'not-valid';

const mockUser = {
  _id: USER_ID,
  email: 'test@example.com',
  phoneNumber: '09123456789',
  role: UserRole.CUSTOMER,
  accountStatus: AccountStatus.ACTIVE,
  isEmailVerified: false,
  isPhoneVerified: false,
  twoFactorEnabled: false,
  failedLoginAttempts: 0,
  tokenVersion: 1,
};

describe('UsersService', () => {
  let service: UsersService;
  let repository: {
    findById: jest.Mock;
    findAll: jest.Mock;
    findAllPaginated: jest.Mock;
    create: jest.Mock;
    updateById: jest.Mock;
    findByEmail: jest.Mock;
    findByEmailWithPassword: jest.Mock;
    findByPhone: jest.Mock;
    findByPhoneWithPassword: jest.Mock;
    verifyEmail: jest.Mock;
    verifyPhone: jest.Mock;
    updatePasswordAndIncrementTokenVersion: jest.Mock;
    incrementTokenVersion: jest.Mock;
    incrementFailedLoginAttempts: jest.Mock;
    lockAccount: jest.Mock;
    resetLoginSecurity: jest.Mock;
    softDelete: jest.Mock;
    blockUser: jest.Mock;
    unblockUser: jest.Mock;
    existsByEmail: jest.Mock;
    existsByPhone: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      findById: jest.fn().mockResolvedValue(mockUser),
      findAll: jest.fn().mockResolvedValue([mockUser]),
      findAllPaginated: jest.fn().mockResolvedValue({ items: [mockUser], total: 1, page: 1, limit: 20 }),
      create: jest.fn().mockResolvedValue(mockUser),
      updateById: jest.fn().mockResolvedValue(mockUser),
      findByEmail: jest.fn().mockResolvedValue(null),
      findByEmailWithPassword: jest.fn().mockResolvedValue(null),
      findByPhone: jest.fn().mockResolvedValue(null),
      findByPhoneWithPassword: jest.fn().mockResolvedValue(null),
      verifyEmail: jest.fn().mockResolvedValue(mockUser),
      verifyPhone: jest.fn().mockResolvedValue(mockUser),
      updatePasswordAndIncrementTokenVersion: jest.fn().mockResolvedValue(mockUser),
      incrementTokenVersion: jest.fn().mockResolvedValue(mockUser),
      incrementFailedLoginAttempts: jest.fn().mockResolvedValue(mockUser),
      lockAccount: jest.fn().mockResolvedValue(mockUser),
      resetLoginSecurity: jest.fn().mockResolvedValue(mockUser),
      softDelete: jest.fn().mockResolvedValue(mockUser),
      blockUser: jest.fn().mockResolvedValue({ ...mockUser, accountStatus: AccountStatus.BANNED }),
      unblockUser: jest.fn().mockResolvedValue({ ...mockUser, accountStatus: AccountStatus.ACTIVE }),
      existsByEmail: jest.fn().mockResolvedValue(false),
      existsByPhone: jest.fn().mockResolvedValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: UsersRepository, useValue: repository }],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── createUser ────────────────────────────────────────────────────
  describe('createUser', () => {
    it('should create a user with customer role', async () => {
      const result = await service.createUser({ email: 'a@b.com', role: UserRole.CUSTOMER });
      expect(result).toBe(mockUser);
      expect(repository.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException for deprecated VENDOR role', async () => {
      await expect(
        service.createUser({ email: 'a@b.com', role: UserRole.VENDOR }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for deprecated DELIVERY role', async () => {
      await expect(
        service.createUser({ email: 'a@b.com', role: UserRole.DELIVERY }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── getUserByIdOrFail ─────────────────────────────────────────────
  describe('getUserByIdOrFail', () => {
    it('should throw BadRequestException for invalid id', async () => {
      await expect(service.getUserByIdOrFail(INVALID_ID)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when user not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.getUserByIdOrFail(USER_ID)).rejects.toThrow(NotFoundException);
    });

    it('should return user when found', async () => {
      const result = await service.getUserByIdOrFail(USER_ID);
      expect(result).toBe(mockUser);
    });
  });

  // ── updateUser ────────────────────────────────────────────────────
  describe('updateUser', () => {
    it('should throw BadRequestException when updating to deprecated role', async () => {
      await expect(
        service.updateUser(USER_ID, { role: UserRole.VENDOR }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow updating to valid role', async () => {
      const result = await service.updateUser(USER_ID, { role: UserRole.ADMIN });
      expect(result).toBe(mockUser);
    });
  });

  // ── blockUser ─────────────────────────────────────────────────────
  describe('blockUser', () => {
    it('should throw BadRequestException when blocking own account', async () => {
      await expect(service.blockUser(USER_ID, USER_ID)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when blocking super admin', async () => {
      repository.findById.mockResolvedValue({ ...mockUser, role: UserRole.SUPER_ADMIN });

      await expect(
        service.blockUser(USER_ID, new Types.ObjectId().toHexString()),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should block a regular user', async () => {
      const actorId = new Types.ObjectId().toHexString();
      const result = await service.blockUser(USER_ID, actorId);
      expect(result.accountStatus).toBe(AccountStatus.BANNED);
    });
  });

  // ── unblockUser ───────────────────────────────────────────────────
  describe('unblockUser', () => {
    it('should unblock a user', async () => {
      const result = await service.unblockUser(USER_ID);
      expect(result.accountStatus).toBe(AccountStatus.ACTIVE);
    });
  });

  // ── listUsersPaginated ────────────────────────────────────────────
  describe('listUsersPaginated', () => {
    it('should delegate to repository with clamped values', async () => {
      await service.listUsersPaginated(-1, 200);
      expect(repository.findAllPaginated).toHaveBeenCalledWith(1, 100, undefined, undefined);
    });
  });

  // ── emailExists / phoneExists ─────────────────────────────────────
  describe('emailExists / phoneExists', () => {
    it('should return false when email does not exist', async () => {
      const result = await service.emailExists('new@example.com');
      expect(result).toBe(false);
    });

    it('should return true when email exists', async () => {
      repository.existsByEmail.mockResolvedValue(true);
      const result = await service.emailExists('existing@example.com');
      expect(result).toBe(true);
    });
  });
});
