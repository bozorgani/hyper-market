import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../infrastructure/logger/logger.service';
import { CategoriesModule } from '../categories/categories.module';
import { AdminSearchController, SearchController } from './search.controller';
import { createMeilisearchClient, MEILISEARCH_CLIENT } from './meilisearch-client.provider';
import { SearchIndexer } from './search.indexer';
import { SearchQueueService } from './search-queue.service';
import { SearchWorker } from './search.worker';
import { SearchService } from './search.service';
import { SearchSubscriber } from './search.subscriber';

@Module({
  imports: [CategoriesModule],
  controllers: [SearchController, AdminSearchController],
  providers: [
    // ── Shared Meilisearch client (singleton) ────────────────────────
    {
      provide: MEILISEARCH_CLIENT,
      useFactory: createMeilisearchClient,
      inject: [ConfigService, LoggerService],
    },
    // ── Search services ──────────────────────────────────────────────
    SearchService,
    SearchIndexer,
    SearchQueueService,
    SearchSubscriber,
    SearchWorker,
  ],
  exports: [SearchIndexer, SearchService, MEILISEARCH_CLIENT],
})
export class SearchModule {}
