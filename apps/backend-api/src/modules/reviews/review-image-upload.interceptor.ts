import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { Observable } from 'rxjs';
import {
  createProductImageMulterLimits,
  productImageFileFilter,
} from '../products/storage/product-image-validation';

/**
 * Review image uploads use the same validated, configured image storage as
 * product images. The review endpoint remains separate so only authenticated
 * users can upload review media.
 */
@Injectable()
export class ReviewImageUploadInterceptor implements NestInterceptor {
  private readonly interceptor: NestInterceptor;

  constructor(configService: ConfigService) {
    const maxFileSizeBytes = Number(
      configService.get<string>('PRODUCT_IMAGE_MAX_BYTES', '5242880'),
    );
    const InterceptorClass = FileInterceptor('image', {
      limits: createProductImageMulterLimits(maxFileSizeBytes),
      fileFilter: productImageFileFilter,
    });

    this.interceptor = new InterceptorClass();
  }

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> | Promise<Observable<unknown>> {
    return this.interceptor.intercept(context, next);
  }
}
