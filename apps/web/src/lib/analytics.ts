import { api } from "@/services/api";
import { useAuthStore } from "@/store/auth-store";

export type AnalyticsEventType =
  | "PRODUCT_VIEW"
  | "PRODUCT_CLICK"
  | "ADD_TO_CART"
  | "REMOVE_FROM_CART"
  | "CHECKOUT_START"
  | "ORDER_CREATED"
  | "PAYMENT_SUCCESS"
  | "SEARCH_QUERY"
  | "LOGIN"
  | "REGISTER";

type AnalyticsPayload = {
  type: AnalyticsEventType;
  metadata?: Record<string, unknown>;
};

const DEVICE_KEY = "hyper_market_device_id";

// Stores the absolute timestamp until which an event key is suppressed.
// Using an expiry (instead of a "last sent" timestamp) lets us purge entries
// that can no longer suppress anything, which is what bounds the map size.
const throttleExpiresAt = new Map<string, number>();
const MAX_THROTTLE_ENTRIES = 1000;

function getThrottleWindowMs(type: AnalyticsEventType): number {
  switch (type) {
    case "PRODUCT_VIEW":
      return 10_000;
    case "SEARCH_QUERY":
      return 1_500;
    case "ADD_TO_CART":
    case "REMOVE_FROM_CART":
      return 1_000;
    case "CHECKOUT_START":
      return 3_000;
    default:
      return 2_000;
  }
}

function shouldSendAnalyticsEvent(payload: AnalyticsPayload): boolean {
  const key = `${payload.type}:${JSON.stringify(payload.metadata ?? {})}`;
  const now = Date.now();
  const expiresAt = throttleExpiresAt.get(key) ?? 0;

  if (now < expiresAt) {
    return false;
  }

  throttleExpiresAt.set(key, now + getThrottleWindowMs(payload.type));
  if (throttleExpiresAt.size > MAX_THROTTLE_ENTRIES) {
    pruneThrottleEntries(now);
  }
  return true;
}

// Keep the in-memory throttle map bounded so it cannot grow for every distinct
// (type + metadata) pair the user ever triggers. Expired entries are dropped
// first; if we are still over the cap, the oldest insertions are evicted.
function pruneThrottleEntries(now: number): void {
  for (const [key, expiresAt] of throttleExpiresAt) {
    if (expiresAt <= now) {
      throttleExpiresAt.delete(key);
    }
  }
  while (throttleExpiresAt.size > MAX_THROTTLE_ENTRIES) {
    const oldest = throttleExpiresAt.keys().next().value;
    if (oldest === undefined) break;
    throttleExpiresAt.delete(oldest);
  }
}

function getDeviceId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(DEVICE_KEY);
}

export function trackAnalyticsEvent(payload: AnalyticsPayload): void {
  if (typeof window === "undefined") return;

  if (!shouldSendAnalyticsEvent(payload)) return;

  const user = useAuthStore.getState().user;

  void api
    .post("/analytics/event", {
      userId: user?.id ?? null,
      type: payload.type,
      metadata: payload.metadata ?? {},
      sessionId: user?.sessionId ?? null,
      deviceId: user?.deviceId ?? getDeviceId(),
    })
    .catch(() => undefined);
}
