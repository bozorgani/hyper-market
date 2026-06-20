import { registerAs } from '@nestjs/config';

export const envConfig = registerAs('env', () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  appEnv: process.env.APP_ENV ?? 'development',
  mongoUri: process.env.MONGO_URI,
  redisHost: process.env.REDIS_HOST,
  redisPort: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  jwtSecret: process.env.JWT_SECRET,
}));
