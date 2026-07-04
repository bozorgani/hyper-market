import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsService } from './permissions.service';
import { PermissionRepository } from '../repositories/permission.repository';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { LoggerService } from '../../../infrastructure/logger/logger.service';
import { UserRole } from '../../users/enums/user-role.enum';
import { ROLE_PERMISSIONS } from '../role-permissions.constant';

const mockDbPermissions = [
  { role: UserRole.SUPER_ADMIN, name: '*', resource: '*', action: '*' },
  { role: UserRole.ADMIN, name: 'products.create', resource: 'products', action: 'create' },
  { role: UserRole.CUSTOMER, name: 'cart.view', resource: 'cart', action: 'view' },
];

describe('PermissionsService', () => {
  let service: PermissionsService;
  let permissionRepository: {
    findDistinctRoles: jest.Mock;
    findByRole: jest.Mock;
    findAll: jest.Mock;
    upsert: jest.Mock;
    deleteByRoleAndName: jest.Mock;
  };
  let redisService: {
    get: jest.Mock;
    set: jest.Mock;
    delete: jest.Mock;
  };
  let loggerService: {
    info: jest.Mock;
    warn: jest.Mock;
  };

  beforeEach(async () => {
    permissionRepository = {
      findDistinctRoles: jest.fn().mockResolvedValue([UserRole.SUPER_ADMIN]),
      findByRole: jest.fn().mockResolvedValue([]),
      findAll: jest.fn().mockResolvedValue(mockDbPermissions),
      upsert: jest.fn().mockResolvedValue(undefined),
      deleteByRoleAndName: jest.fn().mockResolvedValue(true),
    };

    redisService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    loggerService = {
      info: jest.fn(),
      warn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        { provide: PermissionRepository, useValue: permissionRepository },
        { provide: RedisService, useValue: redisService },
        { provide: LoggerService, useValue: loggerService },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── onModuleInit ──────────────────────────────────────────────────
  describe('onModuleInit', () => {
    it('should not seed when roles already exist in DB', async () => {
      await service.onModuleInit();
      expect(permissionRepository.upsert).not.toHaveBeenCalled();
    });

    it('should seed from static constant when DB is empty', async () => {
      permissionRepository.findDistinctRoles.mockResolvedValue([]);
      await service.onModuleInit();
      expect(permissionRepository.upsert).toHaveBeenCalled();
    });

    it('should handle DB errors gracefully during init', async () => {
      permissionRepository.findDistinctRoles.mockRejectedValue(new Error('DB down'));
      await expect(service.onModuleInit()).resolves.not.toThrow();
      expect(loggerService.warn).toHaveBeenCalled();
    });
  });

  // ── getPermissionsForRole ─────────────────────────────────────────
  describe('getPermissionsForRole', () => {
    it('should return cached permissions from Redis when available', async () => {
      const cached = { [UserRole.ADMIN]: ['products.create'] };
      redisService.get.mockResolvedValue(cached);

      const result = await service.getPermissionsForRole(UserRole.ADMIN);
      expect(result).toEqual(['products.create']);
      expect(permissionRepository.findByRole).not.toHaveBeenCalled();
    });

    it('should fall back to DB when Redis has no data', async () => {
      permissionRepository.findByRole.mockResolvedValue([
        { role: UserRole.ADMIN, name: 'products.create' },
      ]);

      const result = await service.getPermissionsForRole(UserRole.ADMIN);
      expect(result).toEqual(['products.create']);
      expect(redisService.set).toHaveBeenCalled();
    });

    it('should fall back to static constant when DB returns empty', async () => {
      permissionRepository.findByRole.mockResolvedValue([]);

      const result = await service.getPermissionsForRole(UserRole.SUPER_ADMIN);
      expect(result).toEqual(ROLE_PERMISSIONS[UserRole.SUPER_ADMIN]);
    });
  });

  // ── hasPermission ─────────────────────────────────────────────────
  describe('hasPermission', () => {
    it('should return true for wildcard permission', async () => {
      const cached = { [UserRole.SUPER_ADMIN]: ['*'] };
      redisService.get.mockResolvedValue(cached);

      const result = await service.hasPermission(UserRole.SUPER_ADMIN, 'anything');
      expect(result).toBe(true);
    });

    it('should return true for specific permission match', async () => {
      const cached = { [UserRole.ADMIN]: ['products.create', 'orders.view'] };
      redisService.get.mockResolvedValue(cached);

      const result = await service.hasPermission(UserRole.ADMIN, 'products.create');
      expect(result).toBe(true);
    });

    it('should return false for missing permission', async () => {
      const cached = { [UserRole.CUSTOMER]: ['cart.view'] };
      redisService.get.mockResolvedValue(cached);

      const result = await service.hasPermission(UserRole.CUSTOMER, 'admin.panel');
      expect(result).toBe(false);
    });
  });

  // ── grantPermission ───────────────────────────────────────────────
  describe('grantPermission', () => {
    it('should upsert permission and invalidate cache', async () => {
      await service.grantPermission(UserRole.ADMIN, 'orders.export', 'orders', 'export');

      expect(permissionRepository.upsert).toHaveBeenCalledWith({
        role: UserRole.ADMIN,
        name: 'orders.export',
        resource: 'orders',
        action: 'export',
      });
      expect(redisService.delete).toHaveBeenCalled();
    });
  });

  // ── revokePermission ──────────────────────────────────────────────
  describe('revokePermission', () => {
    it('should delete permission and invalidate cache when found', async () => {
      const result = await service.revokePermission(UserRole.ADMIN, 'orders.export');
      expect(result).toBe(true);
      expect(redisService.delete).toHaveBeenCalled();
    });

    it('should not invalidate cache when permission not found', async () => {
      permissionRepository.deleteByRoleAndName.mockResolvedValue(false);
      const result = await service.revokePermission(UserRole.ADMIN, 'nonexistent');
      expect(result).toBe(false);
      expect(redisService.delete).not.toHaveBeenCalled();
    });
  });

  // ── getFullPermissionMap ──────────────────────────────────────────
  describe('getFullPermissionMap', () => {
    it('should return cached map when available', async () => {
      const cached = { [UserRole.ADMIN]: ['products.create'] };
      redisService.get.mockResolvedValue(cached);

      const result = await service.getFullPermissionMap();
      expect(result[UserRole.ADMIN]).toEqual(['products.create']);
    });

    it('should load from DB and merge with static when no cache', async () => {
      const result = await service.getFullPermissionMap();
      // DB has customer permissions, should be in result
      expect(result[UserRole.CUSTOMER]).toEqual(['cart.view']);
      // Static fallback should be present for roles not in DB
      expect(result[UserRole.SUPER_ADMIN]).toBeDefined();
    });

    it('should fall back to static when both cache and DB fail', async () => {
      redisService.get.mockRejectedValue(new Error('Redis down'));
      permissionRepository.findAll.mockRejectedValue(new Error('DB down'));

      const result = await service.getFullPermissionMap();
      expect(result).toEqual(ROLE_PERMISSIONS);
    });
  });
});
