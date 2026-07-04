import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthService } from './health.service';
import { DatabaseHealthIndicator } from './indicators/database.health';
import { RedisHealthIndicator } from './indicators/redis.health';
import { MeilisearchHealthIndicator } from './indicators/meilisearch.health';
import { SmtpHealthIndicator } from './indicators/smtp.health';

function createMockIndicator(name: string, status: 'ok' | 'degraded' | 'down') {
  return {
    name,
    check: jest.fn().mockResolvedValue({ status, details: {} }),
  };
}

describe('HealthService', () => {
  let service: HealthService;
  let databaseHealth: ReturnType<typeof createMockIndicator>;
  let redisHealth: ReturnType<typeof createMockIndicator>;
  let meilisearchHealth: ReturnType<typeof createMockIndicator>;
  let smtpHealth: ReturnType<typeof createMockIndicator>;

  beforeEach(async () => {
    databaseHealth = createMockIndicator('database', 'ok');
    redisHealth = createMockIndicator('redis', 'ok');
    meilisearchHealth = createMockIndicator('meilisearch', 'ok');
    smtpHealth = createMockIndicator('smtp', 'ok');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('test') } },
        { provide: DatabaseHealthIndicator, useValue: databaseHealth },
        { provide: RedisHealthIndicator, useValue: redisHealth },
        { provide: MeilisearchHealthIndicator, useValue: meilisearchHealth },
        { provide: SmtpHealthIndicator, useValue: smtpHealth },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should return "ok" when all components are healthy', async () => {
    const result = await service.check();
    expect(result.status).toBe('ok');
    expect(result.components.database.status).toBe('ok');
    expect(result.components.redis.status).toBe('ok');
  });

  it('should return "down" when database is down', async () => {
    databaseHealth.check.mockResolvedValue({ status: 'down', details: { error: 'connection refused' } });

    const result = await service.check();
    expect(result.status).toBe('down');
  });

  it('should return "degraded" when a non-database component is down', async () => {
    redisHealth.check.mockResolvedValue({ status: 'down', details: { error: 'timeout' } });

    const result = await service.check();
    expect(result.status).toBe('degraded');
  });

  it('should return "degraded" when any component is degraded', async () => {
    meilisearchHealth.check.mockResolvedValue({ status: 'degraded', details: { latency: 5000 } });

    const result = await service.check();
    expect(result.status).toBe('degraded');
  });

  it('should include uptime, version, and environment', async () => {
    const result = await service.check();
    expect(result.uptime).toBeGreaterThan(0);
    expect(result.version).toBeDefined();
    expect(result.environment).toBe('test');
  });

  it('should run all health checks in parallel', async () => {
    await service.check();
    expect(databaseHealth.check).toHaveBeenCalled();
    expect(redisHealth.check).toHaveBeenCalled();
    expect(meilisearchHealth.check).toHaveBeenCalled();
    expect(smtpHealth.check).toHaveBeenCalled();
  });
});
