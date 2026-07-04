import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../infrastructure/logger/logger.service';

const { Meilisearch } = require('meilisearch') as {
  Meilisearch: new (options: { host: string; apiKey?: string }) => any;
};

/**
 * Factory that creates a single Meilisearch client instance shared across
 * the entire application (SearchService, SearchIndexer, SearchWorker).
 *
 * Before this, each of those three classes created its own `new Meilisearch(…)`
 * which meant three separate HTTP connection pools to the same engine.
 */
export function createMeilisearchClient(
  configService: ConfigService,
  loggerService?: LoggerService,
): any {
  const host = configService.get<string>('MEILI_HOST') ?? process.env.MEILI_HOST ?? 'http://localhost:7700';
  const apiKey = configService.get<string>('MEILI_API_KEY') ?? process.env.MEILI_API_KEY;

  if (loggerService) {
    loggerService.info('[Meilisearch] Creating shared client instance', { host });
  }

  return new Meilisearch({ host, apiKey });
}

/**
 * NestJS provider token for the shared Meilisearch client.
 * Usage: @Inject(MEILISEARCH_CLIENT) private readonly client: any
 */
export const MEILISEARCH_CLIENT = 'MEILISEARCH_CLIENT';
