import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Worker } from 'bullmq';
import { LoggerService } from '../../infrastructure/logger/logger.service';
import { QueueService } from '../../modules/queue/queue.service';
import { OutboxService } from '../../modules/outbox/outbox.service';
import { EventBusService } from './event-bus.service';
import { createBullMQRedisOptions } from '../../config/redis/redis-connection.config';

export const OUTBOX_RELAY_QUEUE = 'outbox-relay';

const MAX_ATTEMPTS = Number(process.env.OUTBOX_RELAY_MAX_ATTEMPTS ?? 5);

type SweepJobData = { type: 'sweep' };

/**
 * Guarantees at-least-once delivery of durable events.
 *
 * A repeatable BullMQ job triggers a periodic sweep. Any outbox row that is still
 * PENDING past the grace window (i.e. it was emitted but never confirmed
 * delivered — typically because the process crashed or a subscriber failed) is
 * re-dispatched through EventBusService and then marked DISPATCHED. After
 * MAX_ATTEMPTS it is dead-lettered as FAILED.
 */
@Injectable()
export class OutboxRelayWorker implements OnModuleInit, OnModuleDestroy {
  private worker?: Worker<SweepJobData>;
  private readonly sweepIntervalMs: number;
  private readonly graceMs: number;

  constructor(
    private readonly queueService: QueueService,
    private readonly outboxService: OutboxService,
    private readonly eventBusService: EventBusService,
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {
    this.sweepIntervalMs = Number(
      this.configService.get<number>('OUTBOX_SWEEP_INTERVAL_MS') ?? 5000,
    );
    this.graceMs = Number(
      this.configService.get<number>('OUTBOX_PENDING_GRACE_MS') ?? 15000,
    );
  }

  async onModuleInit(): Promise<void> {
    if (process.env.WORKERS_ENABLED === 'false') {
      this.logger.info('[OUTBOX] Relay worker disabled (WORKERS_ENABLED=false) — relay will run in a dedicated worker process.');
      return;
    }
    if (process.env.OUTBOX_RELAY_ENABLED === 'false') {
      this.logger.warn('Outbox relay worker is disabled');
      return;
    }

    await this.queueService
      .createJob<SweepJobData>(
        OUTBOX_RELAY_QUEUE,
        { type: 'sweep' },
        {
          repeat: { every: this.sweepIntervalMs },
          removeOnComplete: true,
          removeOnFail: 1000,
        },
      )
      .catch((error) => {
        this.logger.error('Failed to schedule outbox relay sweep', {
          error: error instanceof Error ? error.message : String(error),
        });
      });

    this.worker = new Worker<SweepJobData>(
      OUTBOX_RELAY_QUEUE,
      (job) => this.processSweep(job),
      { connection: createBullMQRedisOptions(this.configService) },
    );

    this.worker.on('failed', (job, error) => {
      this.logger.error('Outbox relay sweep job failed', {
        jobId: job?.id,
        error: error?.message,
      });
    });
  }

  private async processSweep(_job: Job<SweepJobData>): Promise<void> {
    const cutoff = new Date(Date.now() - this.graceMs);
    const pending = await this.outboxService.findPendingOlderThan(cutoff, 100);

    for (const doc of pending) {
      const event = {
        type: doc.eventType,
        payload: doc.payload,
        timestamp: doc.timestamp,
        dedupeKey: doc.dedupeKey,
      } as Parameters<EventBusService['redispatch']>[0];

      try {
        await this.eventBusService.redispatch(event);
        await this.outboxService.markDispatched(doc.dedupeKey);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await this.outboxService.incrementAttempts(doc.dedupeKey);

        if ((doc.attempts ?? 0) + 1 >= MAX_ATTEMPTS) {
          await this.outboxService.markFailed(doc.dedupeKey, message);
        }

        this.logger.warn('Outbox relay redispatch failed', {
          eventType: doc.eventType,
          dedupeKey: doc.dedupeKey,
          attempts: (doc.attempts ?? 0) + 1,
          error: message,
        });
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }
}
