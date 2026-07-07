import { loadFileSecrets } from './file-secrets';

/**
 * Environment variable validation.
 *
 * Runs on application bootstrap (via ConfigModule.validate).
 * Throws a descriptive error when required vars are missing or malformed,
 * preventing the application from starting with an invalid configuration.
 */

// ── Required in ALL environments ──────────────────────────────────────────────
const REQUIRED_ENV_KEYS = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'CORS_ORIGINS',
  // NOTE: PASSWORD_PEPPER is intentionally NOT in required list here.
  // It is validated directly inside PasswordService.
] as const;

// ── Required ONLY in production ───────────────────────────────────────────────
const PRODUCTION_REQUIRED_KEYS = [
  'MEILI_HOST',
  'MEILI_API_KEY',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASS',
] as const;

// ── Numeric validation (min / max bounds) ─────────────────────────────────────
const NUMERIC_VALIDATIONS: Record<string, { min?: number; max?: number; default?: number }> = {
  SMTP_PORT: { min: 1, max: 65535, default: 587 },
  PRODUCT_IMAGE_MAX_BYTES: { min: 1024, max: 104857600 }, // 1KB – 100MB
  IDEMPOTENCY_KEY_TTL_SECONDS: { min: 60, max: 864000 },  // 1min – 10 days
  OUTBOX_SWEEP_INTERVAL_MS: { min: 1000, max: 60000 },
  OUTBOX_PENDING_GRACE_MS: { min: 1000, max: 300000 },
  OUTBOX_RELAY_MAX_ATTEMPTS: { min: 1, max: 50 },
  RATE_LIMIT_SENSITIVE_TTL_MS: { min: 1000, max: 3600000 },
  RATE_LIMIT_AUTH_TTL_MS: { min: 1000, max: 3600000 },
  RATE_LIMIT_DEFAULT_TTL_MS: { min: 1000, max: 3600000 },
  RATE_LIMIT_SENSITIVE_LIMIT: { min: 1, max: 100000 },
  RATE_LIMIT_AUTH_LIMIT: { min: 1, max: 100000 },
  RATE_LIMIT_DEFAULT_LIMIT: { min: 1, max: 100000 },
};

// ── Enum validation ───────────────────────────────────────────────────────────
const ENUM_VALIDATIONS: Record<string, string[]> = {
  STORAGE_DRIVER: ['local', 's3'],
  APP_ENV: ['development', 'staging', 'production', 'test'],
};

export const envValidation = (config: Record<string, unknown>): Record<string, unknown> => {
  loadFileSecrets(config);

  const isProduction = config.APP_ENV === 'production';

  // 1. Required keys (all environments)
  for (const key of REQUIRED_ENV_KEYS) {
    if (config[key] === undefined || config[key] === '') {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  // 2. Required keys (production only)
  if (isProduction) {
    for (const key of PRODUCTION_REQUIRED_KEYS) {
      if (config[key] === undefined || config[key] === '') {
        throw new Error(
          `Missing required environment variable in production: ${key}. ` +
          'This variable is optional in development but mandatory in production.',
        );
      }
    }
  }

  // 3. CORS wildcard check (production)
  const corsOrigins = String(config.CORS_ORIGINS);
  if (isProduction && corsOrigins.split(',').map((origin) => origin.trim()).includes('*')) {
    throw new Error('CORS_ORIGINS cannot contain wildcard (*) in production');
  }

  // 4. JWT secret strength (all environments, stricter in production)
  const accessSecret = String(config.JWT_ACCESS_SECRET ?? '');
  const refreshSecret = String(config.JWT_REFRESH_SECRET ?? '');
  const otpSecret = String(config.OTP_HASH_SECRET ?? '');
  
  // Default/example secrets that should NEVER be used
  const forbiddenSecrets = [
    'change_access_secret_in_production',
    'change_refresh_secret_in_production',
    'change_me_access_secret_32_chars_minimum_123456789',
    'change_me_refresh_secret_32_chars_minimum_123456789',
    'change_otp_hash_secret_in_production',
    'changeme',
    'secret',
    'password',
    'test',
    'example',
    'default',
  ];
  
  // Check for forbidden/default secrets in ALL environments
  for (const secret of forbiddenSecrets) {
    if (accessSecret.toLowerCase().includes(secret.toLowerCase())) {
      throw new Error(
        `JWT_ACCESS_SECRET contains a forbidden/default pattern ("${secret}"). ` +
        'Generate a unique, secure secret using: openssl rand -base64 48'
      );
    }
    if (refreshSecret.toLowerCase().includes(secret.toLowerCase())) {
      throw new Error(
        `JWT_REFRESH_SECRET contains a forbidden/default pattern ("${secret}"). ` +
        'Generate a unique, secure secret using: openssl rand -base64 48'
      );
    }
    if (otpSecret && otpSecret.toLowerCase().includes(secret.toLowerCase())) {
      throw new Error(
        `OTP_HASH_SECRET contains a forbidden/default pattern ("${secret}"). ` +
        'Generate a unique, secure secret using: openssl rand -base64 48'
      );
    }
  }
  
  // Minimum length validation
  if (accessSecret.length < 32) {
    throw new Error(
      `JWT_ACCESS_SECRET must be at least 32 characters, got ${accessSecret.length}. ` +
      'Generate a secure secret using: openssl rand -base64 48'
    );
  }
  if (refreshSecret.length < 32) {
    throw new Error(
      `JWT_REFRESH_SECRET must be at least 32 characters, got ${refreshSecret.length}. ` +
      'Generate a secure secret using: openssl rand -base64 48'
    );
  }
  if (otpSecret && otpSecret.length < 32) {
    throw new Error(
      `OTP_HASH_SECRET must be at least 32 characters, got ${otpSecret.length}. ` +
      'Generate a secure secret using: openssl rand -base64 48'
    );
  }
  
  // Access and refresh secrets must be different
  if (accessSecret === refreshSecret) {
    throw new Error(
      'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different secrets'
    );
  }
  
  // Stricter validation in production
  if (isProduction) {
    if (!hasSufficientEntropy(accessSecret)) {
      console.warn(
        '[SECURITY WARNING] JWT_ACCESS_SECRET has low entropy. ' +
        'Use a cryptographically random secret: openssl rand -base64 48'
      );
    }
    if (!hasSufficientEntropy(refreshSecret)) {
      console.warn(
        '[SECURITY WARNING] JWT_REFRESH_SECRET has low entropy. ' +
        'Use a cryptographically random secret: openssl rand -base64 48'
      );
    }
  }

  // 5. Numeric validations
  for (const [key, rules] of Object.entries(NUMERIC_VALIDATIONS)) {
    const raw = config[key];
    if (raw === undefined || raw === '') continue; // skip unset optional vars

    const value = Number(raw);
    if (!Number.isFinite(value)) {
      throw new Error(`Environment variable ${key} must be a number, got: "${raw}"`);
    }
    if (rules.min !== undefined && value < rules.min) {
      throw new Error(`Environment variable ${key} must be >= ${rules.min}, got: ${value}`);
    }
    if (rules.max !== undefined && value > rules.max) {
      throw new Error(`Environment variable ${key} must be <= ${rules.max}, got: ${value}`);
    }
  }

  // 6. Enum validations
  for (const [key, allowed] of Object.entries(ENUM_VALIDATIONS)) {
    const raw = config[key];
    if (raw === undefined || raw === '') continue; // skip unset optional vars

    const value = String(raw).toLowerCase();
    if (!allowed.includes(value)) {
      throw new Error(
        `Environment variable ${key} must be one of [${allowed.join(', ')}], got: "${raw}"`,
      );
    }
  }

  // 7. S3 storage driver requires S3_BUCKET in production
  if (isProduction && String(config.STORAGE_DRIVER ?? '').toLowerCase() === 's3') {
    if (!config.S3_BUCKET) {
      throw new Error(
        'STORAGE_DRIVER=s3 requires S3_BUCKET to be set in production',
      );
    }
  }

  // 8. SMTP port format check (if provided)
  const smtpPort = config.SMTP_PORT;
  if (smtpPort !== undefined && smtpPort !== '') {
    const port = Number(smtpPort);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(`SMTP_PORT must be a valid port number (1-65535), got: "${smtpPort}"`);
    }
  }

  return config;
};

/**
 * Checks if a secret has sufficient entropy (randomness).
 * A good secret should contain a mix of character types.
 * 
 * @param secret - The secret to check
 * @returns true if the secret has sufficient entropy
 */
function hasSufficientEntropy(secret: string): boolean {
  const hasLower = /[a-z]/.test(secret);
  const hasUpper = /[A-Z]/.test(secret);
  const hasDigit = /\d/.test(secret);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(secret);
  
  // Count how many character types are present
  const varietyCount = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;
  
  // Require at least 3 different character types
  if (varietyCount < 3) {
    return false;
  }
  
  // Check for repeated patterns (e.g., "aaaa", "1234")
  const uniqueChars = new Set(secret).size;
  const uniqueRatio = uniqueChars / secret.length;
  
  // If less than 50% of characters are unique, entropy is too low
  if (uniqueRatio < 0.5) {
    return false;
  }
  
  return true;
}
