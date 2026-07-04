import test from 'node:test';
import assert from 'node:assert/strict';
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

test('JwtAuthGuard allows requests marked as public', () => {
  const guard = new JwtAuthGuard(createReflector(true) as never);

  assert.equal(guard.canActivate(createContext()), true);
});

test('RolesGuard allows access when no role metadata exists', () => {
  const guard = new RolesGuard(createReflector(undefined) as never);

  assert.equal(guard.canActivate(createContext()), true);
});

test('RolesGuard allows a user with a required role', () => {
  const guard = new RolesGuard(createReflector([UserRole.ADMIN]) as never);

  assert.equal(guard.canActivate(createContext({ role: UserRole.ADMIN })), true);
});

test('RolesGuard rejects missing user for protected role metadata', () => {
  const guard = new RolesGuard(createReflector([UserRole.ADMIN]) as never);

  assert.throws(() => guard.canActivate(createContext()), ForbiddenException);
});

test('RolesGuard rejects users without a required role', () => {
  const guard = new RolesGuard(createReflector([UserRole.ADMIN]) as never);

  assert.throws(
    () => guard.canActivate(createContext({ role: UserRole.CUSTOMER })),
    ForbiddenException,
  );
});

test('PermissionsGuard allows access when no permission metadata exists', async () => {
  const guard = new PermissionsGuard(
    createReflector(undefined) as never,
    createMockPermissionsService() as never,
  );

  assert.equal(await guard.canActivate(createContext()), true);
});

test('PermissionsGuard allows super admin wildcard permissions', async () => {
  const guard = new PermissionsGuard(
    createReflector(['unknown.permission']) as never,
    createMockPermissionsService() as never,
  );

  assert.equal(await guard.canActivate(createContext({ role: UserRole.SUPER_ADMIN })), true);
});

test('PermissionsGuard allows admin mapped permissions', async () => {
  const guard = new PermissionsGuard(
    createReflector(['products.create']) as never,
    createMockPermissionsService() as never,
  );

  assert.equal(await guard.canActivate(createContext({ role: UserRole.ADMIN })), true);
});

test('PermissionsGuard rejects missing user for protected permission metadata', async () => {
  const guard = new PermissionsGuard(
    createReflector(['products.create']) as never,
    createMockPermissionsService() as never,
  );

  await assert.rejects(() => guard.canActivate(createContext()), ForbiddenException);
});

test('PermissionsGuard rejects users without required permissions', async () => {
  const guard = new PermissionsGuard(
    createReflector(['products.create']) as never,
    createMockPermissionsService() as never,
  );

  await assert.rejects(
    () => guard.canActivate(createContext({ role: UserRole.CUSTOMER })),
    ForbiddenException,
  );
});
