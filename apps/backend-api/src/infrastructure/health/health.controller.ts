import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { HealthService, HealthReport } from './health.service';

@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Liveness probe — returns "ok" as long as the process is running.
   * Does NOT check dependencies (fast, zero side-effects).
   */
  @Get('live')
  liveness(): { status: string; timestamp: string; uptime: number } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  /**
   * Readiness probe — checks all critical dependencies:
   *   Database, Redis, Meilisearch, SMTP
   *
   * HTTP status mapping:
   *   - 200 when status is "ok" or "degraded" (instance can still serve traffic)
   *   - 503 when status is "down" (critical dependency, currently database, is unavailable)
   */
  @Get('ready')
  async readiness(
    @Res({ passthrough: true }) response: Response,
  ): Promise<HealthReport> {
    const report = await this.healthService.check();
    this.applyReadinessStatusCode(response, report);
    return report;
  }

  /**
   * Legacy endpoint — kept for backward compatibility.
   * Now delegates to the readiness check.
   */
  @Get()
  async getHealth(
    @Res({ passthrough: true }) response: Response,
  ): Promise<HealthReport> {
    const report = await this.healthService.check();
    this.applyReadinessStatusCode(response, report);
    return report;
  }

  private applyReadinessStatusCode(response: Response, report: HealthReport): void {
    if (report.status === 'down') {
      response.status(503);
    }
  }
}
