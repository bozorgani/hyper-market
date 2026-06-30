import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../infrastructure/logger/logger.service';
import { QueueService } from '../queue/queue.service';
import type { ProductSearchDocument } from './search.indexer';

export const SEARCH_INDEXING_QUEUE = 'search-indexing';

export type SearchIndexingJobData =
  | {
      action: 'index_product';
      document: ProductSearchDocument;
    }
  | {
      action: 'delete_product';
      productId: string;
    };

@Injectable()
export class SearchQueueService {
  constructor(
    private readonly queueService: QueueService,
    private readonly loggerService: LoggerService,
  ) {}

  async enqueueIndexProduct(document: ProductSearchDocument): Promise<void> {
    await this.enqueue({ action: 'index_product', document });
  }

  async enqueueDeleteProduct(productId: string): Promise<void> {
    await this.enqueue({ action: 'delete_product', productId });
  }

  private async enqueue(data: SearchIndexingJobData): Promise<void> {
    try {
      await this.queueService.createJob(SEARCH_INDEXING_QUEUE, data, {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      });
    } catch (error) {
      this.loggerService.error('Failed to enqueue search indexing job', {
        action: data.action,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
