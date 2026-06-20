export const envValidation = (config: Record<string, unknown>): Record<string, unknown> => {
  const required = ['PORT', 'APP_ENV', 'MONGO_URI', 'REDIS_HOST', 'REDIS_PORT', 'JWT_SECRET'];

  for (const key of required) {
    if (config[key] === undefined || config[key] === '') {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  return config;
};
