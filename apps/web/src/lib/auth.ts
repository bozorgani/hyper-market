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

/**
 * Decode a JWT payload without signature verification.
 * Returns null if the token is malformed.
 */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    const jsonPayload = decodeURIComponent(
      atob(base64 + padding)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}
