export interface BaseEvent<T = unknown> {
  type: string;
  payload: T;
  timestamp: number;
  /**
   * Content-hash idempotency key, set by EventBusService before dispatch so
   * subscribers (and the outbox relay) can de-duplicate redeliveries.
   */
  dedupeKey?: string;
}
