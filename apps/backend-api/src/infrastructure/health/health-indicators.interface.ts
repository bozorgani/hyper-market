/**
 * Lightweight interface for health-checkable components.
 *
 * Services that want to expose their health status should register
 * a provider implementing this interface under the HEALTH_INDICATOR token.
 * The HealthService will discover and call all registered indicators.
 */
export interface HealthIndicator {
  /** A unique name for this component (e.g. "database", "redis") */
  name: string;

  /** Check whether the component is healthy */
  check(): Promise<HealthIndicatorResult>;
}

export type HealthIndicatorResult = {
  status: 'ok' | 'degraded' | 'down';
  latencyMs?: number;
  error?: string;
  meta?: Record<string, unknown>;
};

/**
 * NestJS injection token for the collection of health indicators.
 */
export const HEALTH_INDICATORS = 'HEALTH_INDICATORS';
