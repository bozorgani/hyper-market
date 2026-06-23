"use client";

import { useCallback } from "react";
import { AnalyticsEventType, trackAnalyticsEvent } from "@/lib/analytics";

export function useAnalytics() {
  const trackEvent = useCallback((type: AnalyticsEventType, metadata?: Record<string, unknown>) => {
    trackAnalyticsEvent({ type, metadata });
  }, []);

  const trackProductView = useCallback((productId: string, metadata?: Record<string, unknown>) => {
    trackEvent("PRODUCT_VIEW", { productId, ...metadata });
  }, [trackEvent]);

  const trackSearch = useCallback((query: string, resultsCount?: number) => {
    trackEvent("SEARCH_QUERY", { query, resultsCount });
  }, [trackEvent]);

  const trackCheckoutStart = useCallback((metadata?: Record<string, unknown>) => {
    trackEvent("CHECKOUT_START", metadata);
  }, [trackEvent]);

  return { trackEvent, trackProductView, trackSearch, trackCheckoutStart };
}
