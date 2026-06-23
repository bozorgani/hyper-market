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

function getDeviceId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(DEVICE_KEY);
}

export function trackAnalyticsEvent(payload: AnalyticsPayload): void {
  if (typeof window === "undefined") return;

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
