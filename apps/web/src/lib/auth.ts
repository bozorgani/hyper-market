/**
 * Shared auth utility functions — single source of truth for role checks.
 *
 * Previously duplicated across 7+ files (header, bottom-nav, cart, checkout,
 * orders, profile, admin-shell, login). Centralizing here ensures consistent
 * role comparison logic and simplifies future role-structure changes.
 */

/**
 * Check if the user has a customer-level role (can use cart, checkout, orders).
 */
export function isCustomerRole(role?: string): boolean {
  return role === "customer" || role === "CUSTOMER";
}

/**
 * Check if the user has an admin-level role (can access admin panel).
 */
export function isAdminRole(role?: string): boolean {
  return (
    role === "ADMIN" ||
    role === "SUPER_ADMIN" ||
    role === "admin" ||
    role === "super_admin"
  );
}
