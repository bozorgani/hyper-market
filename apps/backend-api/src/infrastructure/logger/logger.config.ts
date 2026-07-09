import { createLogger, format, transports } from 'winston';

const SENSITIVE_KEYS = ['password', 'passwordHash', 'token', 'accessToken', 'refreshToken', 'authorization', 'cookie', 'code', 'otp', 'otpCode', 'secret', 'apiKey', 'pepper'];
const isProduction = process.env.APP_ENV === 'production';

const redactSensitiveData = format((info) => {
  for (const key of Object.keys(info)) {
    if (SENSITIVE_KEYS.some((sensitiveKey) => key.toLowerCase().includes(sensitiveKey.toLowerCase()))) {
      info[key] = '[REDACTED]';
    }
  }

  return info;
});

export const winstonLogger = createLogger({
  level: isProduction ? 'info' : 'debug',
  format: format.combine(
    format.timestamp(),
    redactSensitiveData(),
    isProduction
      ? format.json()
      : format.printf((info) => {
          const { timestamp, level, message, ...meta } = info;
          const serializedMeta = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
          return `[${timestamp}] ${level}: ${message}${serializedMeta}`;
        }),
  ),
  transports: [new transports.Console()],
});
