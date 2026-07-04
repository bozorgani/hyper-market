/**
 * User roles for the Hyper Market platform.
 *
 * ┌──────────────┬──────────────────────────────────────────────────────┐
 * │ Role         │ Description                                          │
 * ├──────────────┼──────────────────────────────────────────────────────┤
 * │ SUPER_ADMIN  │ Full system access (wildcard permissions)            │
 * │ ADMIN        │ Store admin (products, orders, users, analytics)     │
 * │ CUSTOMER     │ End customer (browse, cart, order, track)            │
 * ├──────────────┼──────────────────────────────────────────────────────┤
 * │ VENDOR       │ ⚠️  DEPRECATED — reserved for future multi-vendor   │
 * │ DELIVERY     │ ⚠️  DEPRECATED — reserved for future delivery fleet │
 * └──────────────┴──────────────────────────────────────────────────────┘
 *
 * VENDOR and DELIVERY are retained in the enum for backward compatibility
 * with existing DB documents, but assigning them to new users is blocked
 * at the service layer. See UsersService for the guard.
 */
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  /** @deprecated Not used in single-vendor mode. Do not assign to new users. */
  VENDOR = 'vendor',
  /** @deprecated Not used in single-vendor mode. Do not assign to new users. */
  DELIVERY = 'delivery',
  CUSTOMER = 'customer',
}

/**
 * Roles that are deprecated and must not be assigned to new users.
 * Existing documents with these roles continue to work (read-only).
 */
export const DEPRECATED_ROLES: readonly UserRole[] = [
  UserRole.VENDOR,
  UserRole.DELIVERY,
];

/**
 * Roles that can be actively assigned in the current deployment.
 */
export const ACTIVE_ROLES: readonly UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.CUSTOMER,
];
