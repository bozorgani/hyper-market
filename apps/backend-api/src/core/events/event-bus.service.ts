import { Injectable } from '@nestjs/common';
import { BaseEvent } from './interfaces/base-event.interface';

type EventListener<T = unknown> = (event: BaseEvent<T>) => void | Promise<void>;

@Injectable()
export class EventBusService {
  private readonly listeners = new Map<string, Set<EventListener>>();

  emit<T = unknown>(event: BaseEvent<T>): void {
    const eventListeners = this.listeners.get(event.type);

    if (!eventListeners || eventListeners.size === 0) {
      return;
    }

    for (const listener of eventListeners) {
      void Promise.resolve(listener(event)).catch(() => undefined);
    }
  }

  on<T = unknown>(eventType: string, listener: EventListener<T>): () => void {
    const eventListeners = this.listeners.get(eventType) ?? new Set<EventListener>();
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
}
