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

const lastTrackedAt = new Map<string, number>();

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
  const lastSentAt = lastTrackedAt.get(key) ?? 0;

  if (now - lastSentAt < getThrottleWindowMs(payload.type)) {
    return false;
  }

  lastTrackedAt.set(key, now);
  return true;
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
