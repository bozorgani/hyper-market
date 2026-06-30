import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, RedisOptions, Worker } from 'bullmq';
import { LoggerService } from '../../infrastructure/logger/logger.service';
import { SEARCH_INDEXING_QUEUE, SearchIndexingJobData } from './search-queue.service';

const { Meilisearch } = require('meilisearch') as {
  Meilisearch: new (options: { host: string; apiKey?: string }) => any;
};

@Injectable()
export class SearchWorker implements OnModuleInit, OnModuleDestroy {
  private readonly indexName = 'products';
  private readonly client: any;
  private worker?: Worker<SearchIndexingJobData>;

  constructor(
    private readonly configService: ConfigService,
    private readonly loggerService: LoggerService,
  ) {
    this.client = new Meilisearch({
      host: process.env.MEILI_HOST ?? 'http://localhost:7700',
      apiKey: process.env.MEILI_API_KEY,
    });
  }

  onModuleInit(): void {
    if (process.env.SEARCH_INDEXING_WORKER_ENABLED === 'false') {
      this.loggerService.warn('Search indexing worker is disabled');
      return;
    }

    this.worker = new Worker<SearchIndexingJobData>(
      SEARCH_INDEXING_QUEUE,
      async (job) => this.processJob(job),
      {
        connection: this.createRedisConnectionOptions(),
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

  private createRedisConnectionOptions(): RedisOptions {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (redisUrl) {
      const parsedUrl = new URL(redisUrl);
      return {
        host: parsedUrl.hostname,
        port: parsedUrl.port ? parseInt(parsedUrl.port, 10) : 6379,
        username: parsedUrl.username || undefined,
        password: parsedUrl.password || undefined,
        db: parsedUrl.pathname ? parseInt(parsedUrl.pathname.replace('/', ''), 10) || 0 : 0,
        maxRetriesPerRequest: null,
        retryStrategy: (times) => Math.min(times * 100, 3000),
      };
    }

    return {
      host: this.configService.get<string>('REDIS_HOST'),
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : undefined,
      maxRetriesPerRequest: null,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    };
  }
}
