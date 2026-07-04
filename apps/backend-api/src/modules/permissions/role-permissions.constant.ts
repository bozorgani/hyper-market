import { UserRole, DEPRECATED_ROLES } from '../users/enums/user-role.enum';

/**
 * RBAC Permission Map – Hyper Market (Single-Vendor Warehouse)
 *
 * This constant serves as the **seed** and **fallback** for permissions.
 * On first startup, PermissionsService seeds the DB from this map.
 * Afterwards, permissions are managed dynamically via the admin API
 * (POST /permissions/grant, POST /permissions/revoke).
 *
 * The PermissionsGuard resolves permissions via:
 *   Redis cache → MongoDB → this constant (in order of priority)
 *
 * VENDOR and DELIVERY roles are DEPRECATED (single-vendor mode).
 * They have empty permission arrays and cannot be assigned to new users.
 * See DEPRECATED_ROLES in user-role.enum.ts.
 */

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.SUPER_ADMIN]: ['*'],
  [UserRole.ADMIN]: [
    'products.create',
    'products.update',
    'products.delete',
    'categories.create',
    'categories.update',
    'categories.delete',
    'orders.cancel',
    'orders.read',
    'orders.update',
    'users.read',
    'users.ban',
    'payments.read',
    'analytics.read',
    'permissions.read',
    'permissions.update',
  ],
  // Deprecated roles — empty permissions, cannot be assigned to new users
  [UserRole.VENDOR]: [],
  [UserRole.DELIVERY]: [],
  [UserRole.CUSTOMER]: [],
};

/**
 * Helper to check if a role is deprecated at runtime.
 */
export const isDeprecatedRole = (role: string): boolean =>
  (DEPRECATED_ROLES as readonly string[]).includes(role);
