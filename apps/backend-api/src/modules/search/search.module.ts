import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module';
import { AdminSearchController, SearchController } from './search.controller';
import { SearchIndexer } from './search.indexer';
import { SearchQueueService } from './search-queue.service';
import { SearchWorker } from './search.worker';
import { SearchService } from './search.service';
import { SearchSubscriber } from './search.subscriber';

@Module({
  imports: [CategoriesModule],
  controllers: [SearchController, AdminSearchController],
  providers: [SearchService, SearchIndexer, SearchQueueService, SearchSubscriber, SearchWorker],
  exports: [SearchIndexer, SearchService],
})
export class SearchModule {}
