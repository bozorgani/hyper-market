import { createClient } from 'redis';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

export const redisProvider = {
  provide: REDIS_CLIENT,
  useFactory: () => {
    return createClient({
      url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT ?? '6379'}`,
    });
  },
};
