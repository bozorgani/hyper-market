import { Injectable, Optional } from '@nestjs/common';
import { BaseEvent } from './interfaces/base-event.interface';
import { LoggerService } from '../../infrastructure/logger/logger.service';
import { OutboxService } from '../../modules/outbox/outbox.service';

type EventListener<T = unknown> = (event: BaseEvent<T>) => void | Promise<void>;

/**
 * Event types that are high-frequency and do not require crash-safe delivery.
 * They are dispatched in-process only and never written to the outbox.
 */
const NON_DURABLE_EVENTS = new Set<string>(['SEARCH_PERFORMED']);

@Injectable()
export class EventBusService {
  private readonly listeners = new Map<string, Set<EventListener>>();

  constructor(
    @Optional() private readonly outboxService?: OutboxService,
    @Optional() private readonly logger?: LoggerService,
  ) {}

  emit<T = unknown>(event: BaseEvent<T>): void {
    if (!this.isDurable(event.type)) {
      // Hot path (e.g. search tracking): dispatch synchronously, fire-and-forget.
      void this.dispatchListeners(event);
      return;
    }

    // Durable path: persist -> dispatch -> confirm (all in background).
    void this.publish(event);
  }

  /**
   * Recovery entry point used by OutboxRelayWorker. Re-runs subscriber
   * handlers for an event that was persisted but never confirmed delivered.
   */
  async redispatch<T = unknown>(event: BaseEvent<T>): Promise<void> {
    await this.dispatchListeners(event);
  }

  private async publish<T = unknown>(event: BaseEvent<T>): Promise<void> {
    const dedupeKey = OutboxService.computeDedupeKey(event);

    // 1) Persist BEFORE dispatching so a crash can always be recovered.
    try {
      await this.outboxService?.persist(event);
    } catch (error) {
      this.logger?.warn('Outbox persist failed; dispatching without durability', {
        eventType: event.type,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // 2) Deliver to in-process subscribers (with dedupeKey attached so
    //    consumers can de-duplicate any later relay redelivery).
    event.dedupeKey = dedupeKey;
    const errors = await this.dispatchListeners(event);

    // 3) Mark confirmed only on success; failures stay PENDING for the relay.
    try {
      if (errors.length === 0) {
        await this.outboxService?.markDispatched(dedupeKey);
      }
    } catch (error) {
      this.logger?.warn('Outbox confirm failed', {
        eventType: event.type,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async dispatchListeners<T = unknown>(
    event: BaseEvent<T>,
  ): Promise<string[]> {
    const eventListeners = this.listeners.get(event.type);

    if (!eventListeners || eventListeners.size === 0) {
      return [];
    }

    const errors: string[] = [];
    await Promise.allSettled(
      [...eventListeners].map(async (listener) => {
        try {
          await listener(event);
        } catch (error) {
          errors.push(error instanceof Error ? error.message : String(error));
        }
      }),
    );
    return errors;
  }

  on<T = unknown>(
    eventType: string,
    listener: EventListener<T>,
  ): () => void {
    const eventListeners =
      this.listeners.get(eventType) ?? new Set<EventListener>();
    eventListeners.add(listener as EventListener);
    this.listeners.set(eventType, eventListeners);

    return () => {
      eventListeners.delete(listener as EventListener);
      if (eventListeners.size === 0) {
        this.listeners.delete(eventType);
      }
    };
  }

  removeAllListeners(eventType?: string): void {
    if (eventType) {
      this.listeners.delete(eventType);
      return;
    }

    this.listeners.clear();
  }

  private isDurable(eventType: string): boolean {
    return !NON_DURABLE_EVENTS.has(eventType);
  }
}
