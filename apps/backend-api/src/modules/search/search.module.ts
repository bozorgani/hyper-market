import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module';
import { AdminSearchController, SearchController } from './search.controller';
import { SearchIndexer } from './search.indexer';
import { SearchService } from './search.service';

@Module({
  imports: [CategoriesModule],
  controllers: [SearchController, AdminSearchController],
  providers: [SearchService, SearchIndexer],
  exports: [SearchIndexer, SearchService],
})
export class SearchModule {}
