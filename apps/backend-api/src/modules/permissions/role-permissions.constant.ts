import { UserRole } from '../users/enums/user-role.enum';

/**
 * RBAC Permission Map – Hyper Market (Single-Vendor Warehouse)
 * 
 * NOTE: VENDOR and DELIVERY roles are retained in the UserRole enum for
 * backward compatibility / future multi-vendor expansion, but are NOT
 * used in the current single-vendor deployment. Do not assign these roles
 * in production.
 * 
 * Permissions are statically defined here (performance + auditability).
 * The `permissions` collection in MongoDB is seeded from this constant
 * via `scripts/seed-permissions.js` for reporting / admin UI purposes,
 * but the PermissionsGuard reads from this constant, not the DB.
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
  ],
  // Deprecated – single-vendor mode only – do not assign in production
  [UserRole.VENDOR]: [],
  [UserRole.DELIVERY]: [],
  [UserRole.CUSTOMER]: [],
};
