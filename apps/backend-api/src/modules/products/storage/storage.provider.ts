import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../../infrastructure/logger/logger.service';
import { LocalProductImageStorage } from './local-product-image-storage';
import { S3ProductImageStorage } from './s3-product-image-storage';
import { IProductImageStorage } from './product-image-storage.interface';

/**
 * Factory that creates the appropriate IProductImageStorage implementation
 * based on the STORAGE_DRIVER env var.
 *
 *   STORAGE_DRIVER=local  → LocalProductImageStorage (default)
 *   STORAGE_DRIVER=s3     → S3ProductImageStorage
 *
 * Falls back to "local" if the variable is unset or unrecognised.
 */
export function createProductImageStorage(
  configService: ConfigService,
  loggerService: LoggerService,
): IProductImageStorage {
  const driver = (configService.get<string>('STORAGE_DRIVER') ?? 'local').toLowerCase();

  switch (driver) {
    case 's3': {
      loggerService.info('[Storage] Using S3 product image storage driver');
      return new S3ProductImageStorage(configService, loggerService);
    }
    case 'local':
    default: {
      loggerService.info('[Storage] Using local filesystem product image storage driver');
      return new LocalProductImageStorage(configService);
    }
  }
}
