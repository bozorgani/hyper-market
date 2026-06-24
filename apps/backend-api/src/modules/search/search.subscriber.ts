import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../../core/events/event-bus.service';
import { EventType } from '../../core/events/enums/event-type.enum';
import { BaseEvent } from '../../core/events/interfaces/base-event.interface';
import { Product } from '../products/schemas/product.schema';
import { SearchIndexer } from './search.indexer';

type ProductCreatedPayload = {
  product: Product;
};

@Injectable()
export class SearchSubscriber implements OnModuleInit, OnModuleDestroy {
  private unsubscribeProductCreated?: () => void;

  constructor(
    private readonly eventBusService: EventBusService,
    private readonly searchIndexer: SearchIndexer,
  ) {}

  onModuleInit(): void {
    this.unsubscribeProductCreated = this.eventBusService.on<ProductCreatedPayload>(
      EventType.PRODUCT_CREATED,
      (event) => this.handleProductCreated(event),
    );
  }

  onModuleDestroy(): void {
    this.unsubscribeProductCreated?.();
  }

  private async handleProductCreated(
    event: BaseEvent<ProductCreatedPayload>,
  ): Promise<void> {
    if (!event.payload.product) {
      return;
    }

    await this.searchIndexer.indexProduct(event.payload.product);
  }
}
