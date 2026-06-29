const REQUIRED_ENV_KEYS = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'CORS_ORIGINS',
  // NOTE: PASSWORD_PEPPER is intentionally NOT in required list here.
  // It is validated directly inside PasswordService.
] as const;

export const envValidation = (config: Record<string, unknown>): Record<string, unknown> => {
  for (const key of REQUIRED_ENV_KEYS) {
    if (config[key] === undefined || config[key] === '') {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  const corsOrigins = String(config.CORS_ORIGINS);
  const isProduction = config.APP_ENV === 'production';

  if (isProduction && corsOrigins.split(',').map((origin) => origin.trim()).includes('*')) {
    throw new Error('CORS_ORIGINS cannot contain wildcard (*) in production');
  }

  return config;
};
