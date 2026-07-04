import { Controller, Get } from '@nestjs/common';
import { HealthService, HealthReport } from './health.service';

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
   * Returns 200 with detailed report even when components are down,
   * so that monitoring dashboards can display the specifics.
   * The caller (Kubernetes, load balancer, etc.) should check the
   * top-level `status` field:
   *   - "ok"       → all healthy
   *   - "degraded" → some non-critical components down (still routable)
   *   - "down"     → critical component (database) is unreachable
   */
  @Get('ready')
  async readiness(): Promise<HealthReport> {
    return this.healthService.check();
  }

  /**
   * Legacy endpoint — kept for backward compatibility.
   * Now delegates to the readiness check.
   */
  @Get()
  async getHealth(): Promise<HealthReport> {
    return this.healthService.check();
  }
}
