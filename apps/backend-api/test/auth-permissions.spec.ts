import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import { PermissionsGuard } from '../src/modules/permissions/guards/permissions.guard';
import { UserRole } from '../src/modules/users/enums/user-role.enum';

function createReflector<T>(metadata: T) {
  return {
    getAllAndOverride: () => metadata,
  };
}

function createContext(user?: { role: string }): ExecutionContext {
  return {
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

/**
 * Mock PermissionsService that returns the static ROLE_PERMISSIONS
 * constant — same behaviour as the original guard before dynamic RBAC.
 */
function createMockPermissionsService() {
  const { ROLE_PERMISSIONS } = require('../src/modules/permissions/role-permissions.constant');

  return {
    async getPermissionsForRole(role: string) {
      return ROLE_PERMISSIONS[role as UserRole] ?? [];
    },
  };
}

describe('Auth & Permissions Guards', () => {
  it('JwtAuthGuard allows requests marked as public', () => {
    const guard = new JwtAuthGuard(createReflector(true) as never);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('RolesGuard allows access when no role metadata exists', () => {
    const guard = new RolesGuard(createReflector(undefined) as never);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('RolesGuard allows a user with a required role', () => {
    const guard = new RolesGuard(createReflector([UserRole.ADMIN]) as never);

    expect(guard.canActivate(createContext({ role: UserRole.ADMIN }))).toBe(true);
  });

  it('RolesGuard rejects missing user for protected role metadata', () => {
    const guard = new RolesGuard(createReflector([UserRole.ADMIN]) as never);

    expect(() => guard.canActivate(createContext())).toThrow(ForbiddenException);
  });

  it('RolesGuard rejects users without a required role', () => {
    const guard = new RolesGuard(createReflector([UserRole.ADMIN]) as never);

    expect(() => guard.canActivate(createContext({ role: UserRole.CUSTOMER }))).toThrow(ForbiddenException);
  });

  it('PermissionsGuard allows access when no permission metadata exists', async () => {
    const guard = new PermissionsGuard(
      createReflector(undefined) as never,
      createMockPermissionsService() as never,
    );

    expect(await guard.canActivate(createContext())).toBe(true);
  });

  it('PermissionsGuard allows super admin wildcard permissions', async () => {
    const guard = new PermissionsGuard(
      createReflector(['unknown.permission']) as never,
      createMockPermissionsService() as never,
    );

    expect(await guard.canActivate(createContext({ role: UserRole.SUPER_ADMIN }))).toBe(true);
  });

  it('PermissionsGuard allows admin mapped permissions', async () => {
    const guard = new PermissionsGuard(
      createReflector(['products.create']) as never,
      createMockPermissionsService() as never,
    );

    expect(await guard.canActivate(createContext({ role: UserRole.ADMIN }))).toBe(true);
  });

  it('PermissionsGuard rejects missing user for protected permission metadata', async () => {
    const guard = new PermissionsGuard(
      createReflector(['products.create']) as never,
      createMockPermissionsService() as never,
    );

    await expect(guard.canActivate(createContext())).rejects.toThrow(ForbiddenException);
  });

  it('PermissionsGuard rejects users without required permissions', async () => {
    const guard = new PermissionsGuard(
      createReflector(['products.create']) as never,
      createMockPermissionsService() as never,
    );

    await expect(guard.canActivate(createContext({ role: UserRole.CUSTOMER }))).rejects.toThrow(ForbiddenException);
  });
});
