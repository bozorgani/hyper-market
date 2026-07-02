import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../../core/events/event-bus.service';
import { EventType } from '../../core/events/enums/event-type.enum';
import { BaseEvent } from '../../core/events/interfaces/base-event.interface';
import { AnalyticsService } from './analytics.service';
import { AnalyticsEventType } from './schemas/event.schema';

type AnalyticsEventPayload = Record<string, unknown> & {
  userId?: string | null;
  sessionId?: string | null;
  deviceId?: string | null;
};

@Injectable()
export class AnalyticsSubscriber implements OnModuleInit, OnModuleDestroy {
  private readonly unsubscribeHandlers: Array<() => void> = [];

  constructor(
    private readonly eventBusService: EventBusService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  onModuleInit(): void {
    this.subscribe(EventType.PRODUCT_VIEWED, AnalyticsEventType.PRODUCT_VIEW);
    this.subscribe(EventType.ORDER_CREATED, AnalyticsEventType.ORDER_CREATED);
    this.subscribe(EventType.ORDER_PAID, AnalyticsEventType.PAYMENT_SUCCESS);
    this.subscribe(EventType.USER_REGISTERED, AnalyticsEventType.REGISTER);
    this.subscribe(EventType.SEARCH_PERFORMED, AnalyticsEventType.SEARCH_QUERY);
  }

  onModuleDestroy(): void {
    for (const unsubscribe of this.unsubscribeHandlers) {
      unsubscribe();
    }
  }

  private subscribe(eventType: EventType, analyticsType: AnalyticsEventType): void {
    const unsubscribe = this.eventBusService.on<AnalyticsEventPayload>(
      eventType,
      (event) => this.handleEvent(event, analyticsType),
    );

    this.unsubscribeHandlers.push(unsubscribe);
  }

  private handleEvent(
    event: BaseEvent<AnalyticsEventPayload>,
    analyticsType: AnalyticsEventType,
  ): void {
    const payload = event.payload ?? {};
    const { userId, sessionId, deviceId, ...metadata } = payload;

    this.analyticsService.trackEvent({
      userId: userId ?? null,
      sessionId: sessionId ?? null,
      deviceId: deviceId ?? null,
      dedupeKey: event.dedupeKey ?? null,
      type: analyticsType,
      metadata: {
        ...metadata,
        sourceEventType: event.type,
        sourceTimestamp: event.timestamp,
      },
    });
  }
}
