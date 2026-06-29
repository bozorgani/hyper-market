import { registerAs } from '@nestjs/config';

export const envConfig = registerAs('env', () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  appEnv: process.env.APP_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  corsOrigins: process.env.CORS_ORIGINS,
  // NOTE: PASSWORD_PEPPER intentionally NOT loaded here.
  // It is accessed directly via process.env in PasswordService for security.
}));
