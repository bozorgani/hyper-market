import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Worker } from 'bullmq';
import { LoggerService } from '../../infrastructure/logger/logger.service';
import { MEILISEARCH_CLIENT } from './meilisearch-client.provider';
import { SEARCH_INDEXING_QUEUE, SearchIndexingJobData } from './search-queue.service';
import { createBullMQRedisOptions } from '../../config/redis/redis-connection.config';

@Injectable()
export class SearchWorker implements OnModuleInit, OnModuleDestroy {
  private readonly indexName = 'products';
  private readonly client: any;
  private worker?: Worker<SearchIndexingJobData>;

  constructor(
    private readonly configService: ConfigService,
    private readonly loggerService: LoggerService,
    @Inject(MEILISEARCH_CLIENT) client: any,
  ) {
    this.client = client;
  }

  onModuleInit(): void {
    if (process.env.WORKERS_ENABLED === 'false') {
      this.loggerService.info('[SEARCH] Worker disabled (WORKERS_ENABLED=false) — jobs will be processed by a dedicated worker process.');
      return;
    }
    if (process.env.SEARCH_INDEXING_WORKER_ENABLED === 'false') {
      this.loggerService.warn('Search indexing worker is disabled');
      return;
    }

    this.worker = new Worker<SearchIndexingJobData>(
      SEARCH_INDEXING_QUEUE,
      async (job) => this.processJob(job),
      {
        connection: createBullMQRedisOptions(this.configService),
      },
    );

    this.worker.on('failed', (job, error) => {
      this.loggerService.error('Search indexing job failed', {
        jobId: job?.id,
        action: job?.data.action,
        attemptsMade: job?.attemptsMade,
        error: error.message,
      });
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }

  private async processJob(job: Job<SearchIndexingJobData>): Promise<void> {
    switch (job.data.action) {
      case 'index_product':
        await this.client.index(this.indexName).addDocuments([job.data.document], {
          primaryKey: 'id',
        });
        return;
      case 'delete_product':
        await this.client.index(this.indexName).deleteDocument(job.data.productId);
        return;
      default:
        throw new Error('Unsupported search indexing job action');
    }
  }
}
