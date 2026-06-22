import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobsOptions, Queue, RedisOptions } from 'bullmq';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly connection: RedisOptions;
  private readonly queues = new Map<string, Queue>();

  constructor(private readonly configService: ConfigService) {
    this.connection = this.createRedisConnectionOptions();
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

  private createRedisConnectionOptions(): RedisOptions {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (redisUrl) {
      const parsedUrl = new URL(redisUrl);
      return {
        host: parsedUrl.hostname,
        port: parsedUrl.port ? parseInt(parsedUrl.port, 10) : 6379,
        username: parsedUrl.username || undefined,
        password: parsedUrl.password || undefined,
        db: parsedUrl.pathname ? parseInt(parsedUrl.pathname.replace('/', ''), 10) || 0 : 0,
        maxRetriesPerRequest: null,
        retryStrategy: (times) => Math.min(times * 100, 3000),
      };
    }

    return {
      host: this.configService.get<string>('REDIS_HOST'),
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : undefined,
      maxRetriesPerRequest: null,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    };
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(
      [...this.queues.values()].map(async (queue) => {
        await queue.close();
      }),
    );
  }
}
