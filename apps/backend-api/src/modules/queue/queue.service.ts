import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobsOptions, Queue, RedisOptions } from 'bullmq';
import { createBullMQRedisOptions } from '../../config/redis/redis-connection.config';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly connection: RedisOptions;
  private readonly queues = new Map<string, Queue>();

  constructor(private readonly configService: ConfigService) {
    this.connection = createBullMQRedisOptions(configService);
  }

  async createJob<TData extends object>(
    queueName: string,
    data: TData,
    options: JobsOptions = {},
  ) {
    const queue = this.getQueue(queueName);

    return queue.add(queueName, data, {
      attempts: 3,
      removeOnComplete: true,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      ...options,
    });
  }

  private getQueue(queueName: string): Queue {
    const existingQueue = this.queues.get(queueName);
    if (existingQueue) {
      return existingQueue;
    }

    const queue = new Queue(queueName, {
      connection: this.connection,
      defaultJobOptions: {
        attempts: 3,
        removeOnComplete: true,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    });

    this.queues.set(queueName, queue);
    return queue;
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(
      [...this.queues.values()].map(async (queue) => {
        await queue.close();
      }),
    );
  }
}
