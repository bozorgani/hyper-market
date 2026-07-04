import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthIndicator,
  HealthIndicatorResult,
} from './health-indicators.interface';
import { DatabaseHealthIndicator } from './indicators/database.health';
import { RedisHealthIndicator } from './indicators/redis.health';
import { MeilisearchHealthIndicator } from './indicators/meilisearch.health';
import { SmtpHealthIndicator } from './indicators/smtp.health';

export type HealthStatus = 'ok' | 'degraded' | 'down';

export type HealthReport = {
  status: HealthStatus;
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  components: Record<string, HealthIndicatorResult>;
};

/**
 * Aggregates health checks from all registered indicators.
 *
 * Resolution rules:
 *   - If *any* component is "down" and it's the database → overall "down"
 *   - If *any* component is "down" (non-database) → overall "degraded"
 *   - If *any* component is "degraded" → overall "degraded"
 *   - Otherwise → "ok"
 */
@Injectable()
export class HealthService {
  private readonly indicators: HealthIndicator[];

  constructor(
    private readonly configService: ConfigService,
    databaseHealth: DatabaseHealthIndicator,
    redisHealth: RedisHealthIndicator,
    meilisearchHealth: MeilisearchHealthIndicator,
    smtpHealth: SmtpHealthIndicator,
  ) {
    this.indicators = [databaseHealth, redisHealth, meilisearchHealth, smtpHealth];
  }

  async check(): Promise<HealthReport> {
    const componentResults = await Promise.all(
      this.indicators.map(async (indicator) => {
        const result = await indicator.check();
        return { name: indicator.name, result };
      }),
    );

    const components: Record<string, HealthIndicatorResult> = {};
    for (const { name, result } of componentResults) {
      components[name] = result;
    }

    return {
      status: this.aggregateStatus(components),
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version ?? '0.0.0',
      environment: this.configService.get<string>('APP_ENV', 'development'),
      components,
    };
  }

  private aggregateStatus(
    components: Record<string, HealthIndicatorResult>,
  ): HealthStatus {
    const statuses = Object.entries(components);

    // Database down = system down
    if (components.database?.status === 'down') {
      return 'down';
    }

    // Any other component down = degraded (system still functional)
    if (statuses.some(([, c]) => c.status === 'down')) {
      return 'degraded';
    }

    // Any degraded component = overall degraded
    if (statuses.some(([, c]) => c.status === 'degraded')) {
      return 'degraded';
    }

    return 'ok';
  }
}
