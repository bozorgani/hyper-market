import { Inject, Injectable } from '@nestjs/common';
import { MEILISEARCH_CLIENT } from '../../../modules/search/meilisearch-client.provider';
import { HealthIndicator, HealthIndicatorResult } from '../health-indicators.interface';

@Injectable()
export class MeilisearchHealthIndicator implements HealthIndicator {
  readonly name = 'meilisearch';

  constructor(
    @Inject(MEILISEARCH_CLIENT) private readonly meilisearchClient: any,
  ) {}

  async check(): Promise<HealthIndicatorResult> {
    const start = Date.now();
    try {
      if (!this.meilisearchClient) {
        return { status: 'down', error: 'Meilisearch client not initialized' };
      }
      const result = await this.meilisearchClient.health();
      const isOk = result?.status === 'available';
      return {
        status: isOk ? 'ok' : 'degraded',
        latencyMs: Date.now() - start,
        meta: { status: result?.status },
      };
    } catch (error) {
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
