import { existsSync, readFileSync } from 'fs';

const FILE_SECRET_KEYS = [
  'DATABASE_URL',
  'REDIS_URL',
  'REDIS_PASSWORD',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'PASSWORD_PEPPER',
  'OTP_HASH_SECRET',
  'MEILI_API_KEY',
  'SMTP_PASS',
  'SMS_IR_API_KEY',
  'S3_SECRET_ACCESS_KEY',
  'ERROR_TRACKING_WEBHOOK_URL',
  'COUPON_CODES_JSON',
  'SHIPPING_CONFIG_JSON',
] as const;

/**
 * Load Docker/Kubernetes-style file secrets before env validation.
 *
 * For each KEY in FILE_SECRET_KEYS, KEY_FILE may point to a mounted secret file.
 * The explicit KEY env var always wins. If KEY is missing/empty and KEY_FILE is
 * readable, its trimmed content is copied into both the validation config and
 * process.env so services that read process.env directly also work.
 */
export function loadFileSecrets(config: Record<string, unknown>): void {
  for (const key of FILE_SECRET_KEYS) {
    const fileKey = `${key}_FILE`;
    const currentValue = config[key] ?? process.env[key];
    const filePath = String(config[fileKey] ?? process.env[fileKey] ?? '').trim();

    if (currentValue !== undefined && currentValue !== '') {
      continue;
    }

    if (!filePath) {
      continue;
    }

    if (!existsSync(filePath)) {
      throw new Error(`Secret file configured by ${fileKey} does not exist: ${filePath}`);
    }

    const value = readFileSync(filePath, 'utf8').trim();
    if (!value) {
      throw new Error(`Secret file configured by ${fileKey} is empty: ${filePath}`);
    }

    config[key] = value;
    process.env[key] = value;
  }
}
