/**
 * Shared application constants — single source of truth.
 *
 * Previously scattered across proxy.ts, api.ts, auth-store.ts,
 * backend.ts, analytics.ts, etc. Centralizing here prevents:
 * - Duplicate string definitions
 * - Misspellings that cause silent failures
 * - Hard-to-find cookie name changes
 */

// ── Cookie & Storage Keys ───────────────────────────────────────────────

/** JWT access token cookie name */
export const ACCESS_TOKEN_COOKIE = "hyper_market_access_token";

/** JWT refresh token cookie name (stored as httpOnly on server) */
export const REFRESH_TOKEN_COOKIE = "hyper_market_refresh_token";

/** CSRF token cookie name */
export const CSRF_TOKEN_COOKIE = "hyper_market_csrf_token";

/** CSRF header name sent with mutating requests */
export const CSRF_TOKEN_HEADER = "x-csrf-token";

/** localStorage key for anonymous device tracking */
export const DEVICE_KEY = "hyper_market_device_id";

/** localStorage key for persisted user (legacy — will be removed) */
export const LEGACY_USER_KEY = "hyper_market_user";

/** Legacy storage keys that should be cleaned on hydrate */
export const LEGACY_STORAGE_KEYS = [
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  LEGACY_USER_KEY,
] as const;

// ── Auth & Session ──────────────────────────────────────────────────────

/** OTP code length for phone/email verification */
export const OTP_LENGTH = 6;

/** Cooldown in seconds before user can request a new OTP */
export const RESEND_COOLDOWN_SECONDS = 60;

/** How long (in minutes) an OTP is valid (backend enforces this too) */
export const OTP_VALIDITY_MINUTES = 10;

// ── Roles ───────────────────────────────────────────────────────────────

/** Set of role strings recognized as admin-level access */
export const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN", "admin", "super_admin"]);

/** Set of role strings recognized as customer-level access */
export const CUSTOMER_ROLES = new Set(["customer", "CUSTOMER"]);

// ── API ─────────────────────────────────────────────────────────────────

/** Default API base URL fallback when env vars are not set */
export const DEFAULT_API_BASE_URL = "http://localhost:3001/api/v1";

/** Axios request timeout in milliseconds */
export const API_TIMEOUT_MS = 15_000;

// ── Analytics ───────────────────────────────────────────────────────────

/** Maximum entries in the in-memory analytics throttle map */
export const MAX_ANALYTICS_THROTTLE_ENTRIES = 1000;

// ── Pagination ──────────────────────────────────────────────────────────

/** Default number of items per page for product listings */
export const DEFAULT_PRODUCTS_PER_PAGE = 12;

/** Default number of items per page for search results */
export const DEFAULT_SEARCH_PER_PAGE = 24;

/** Default number of items per page for admin lists */
export const DEFAULT_ADMIN_PER_PAGE = 100;

// ── Cache ───────────────────────────────────────────────────────────────

/** React Query stale time for frequently-changing data (60s) */
export const QUERY_STALE_TIME = 60_000;

/** React Query garbage collection time (5min) */
export const QUERY_GC_TIME = 5 * 60_000;

/** Server-side fetch revalidation in seconds — products */
export const PRODUCTS_CACHE_TTL = 120; // 2 min

/** Server-side fetch revalidation in seconds — categories */
export const CATEGORIES_CACHE_TTL = 600; // 10 min

/** Server-side fetch revalidation in seconds — search */
export const SEARCH_CACHE_TTL = 60; // 1 min

// ── Shipping ────────────────────────────────────────────────────────────

/** Delivery time slot options used in checkout */
export const DELIVERY_TIME_SLOTS = [
  { value: "09:00-12:00", label: "۹ تا ۱۲", emoji: "☀️" },
  { value: "12:00-15:00", label: "۱۲ تا ۱۵", emoji: "🌤️" },
  { value: "15:00-18:00", label: "۱۵ تا ۱۸", emoji: "⛅" },
  { value: "18:00-21:00", label: "۱۸ تا ۲۱", emoji: "🌙" },
] as const;
