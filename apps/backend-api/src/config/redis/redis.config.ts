import { registerAs } from '@nestjs/config';

export const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT ?? '6379'}`,
}));
