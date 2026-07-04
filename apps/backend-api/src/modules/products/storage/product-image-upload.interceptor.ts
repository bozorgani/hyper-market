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
} from './product-image-validation';

@Injectable()
export class ProductImageUploadInterceptor implements NestInterceptor {
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

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> | Promise<Observable<unknown>> {
    return this.interceptor.intercept(context, next);
  }
}
