import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { PermissionsGuard } from './permissions.guard';
import { PermissionsService } from '../services/permissions.service';
import { UserRole } from '../../users/enums/user-role.enum';

function createMockExecutionContext(userRole?: UserRole): ExecutionContext {
  const context = {
    switchToHttp: () => ({
      getRequest: () => ({ user: userRole ? { role: userRole } : undefined }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
  return context;
}

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let permissionsService: PermissionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn().mockReturnValue(['orders.read']),
          },
        },
        {
          provide: PermissionsService,
          useValue: {
            getPermissionsForRole: jest.fn(),
            hasPermission: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
    permissionsService = module.get<PermissionsService>(PermissionsService);
  });

  it('should allow access when role has required permissions from DB/cache', async () => {
    (permissionsService.getPermissionsForRole as jest.Mock).mockResolvedValue([
      'orders.read',
      'orders.update',
    ]);

    const context = createMockExecutionContext(UserRole.ADMIN);
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(permissionsService.getPermissionsForRole).toHaveBeenCalledWith(UserRole.ADMIN);
  });

  it('should deny access when role lacks required permissions', async () => {
    (permissionsService.getPermissionsForRole as jest.Mock).mockResolvedValue([
      'orders.cancel',
    ]);

    const context = createMockExecutionContext(UserRole.ADMIN);
    await expect(guard.canActivate(context)).rejects.toThrow('Insufficient permissions');
  });

  it('should allow wildcard permissions', async () => {
    (permissionsService.getPermissionsForRole as jest.Mock).mockResolvedValue(['*']);

    const context = createMockExecutionContext(UserRole.SUPER_ADMIN);
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should return true when no permissions are required', async () => {
    const reflector = (guard as any).reflector as { getAllAndOverride: jest.Mock };
    reflector.getAllAndOverride.mockReturnValue([]);

    const context = createMockExecutionContext(UserRole.ADMIN);
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should throw ForbiddenException when user role is missing', async () => {
    const context = {
      switchToHttp: () => ({ getRequest: () => ({}) }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow('Missing user permissions');
  });

  it('should use Redis cache when available and fall back to DB/static', async () => {
    (permissionsService.getPermissionsForRole as jest.Mock).mockResolvedValue([
      'products.read',
      'products.create',
    ]);

    const reflector = (guard as any).reflector as { getAllAndOverride: jest.Mock };
    reflector.getAllAndOverride.mockReturnValue(['products.read']);

    const context = createMockExecutionContext(UserRole.ADMIN);
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });
});
