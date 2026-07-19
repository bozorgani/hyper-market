import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';
import { parseCookies } from '../../../shared/utils/parse-cookies';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_TOKEN_COOKIE = 'hyper_market_csrf_token';
const CSRF_TOKEN_HEADER = 'x-csrf-token';

@Injectable()
export class CsrfProtectionMiddleware implements NestMiddleware {
  private readonly enabled: boolean;
  private readonly allowedOrigins: string[];

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<string>('CSRF_PROTECTION_ENABLED', 'true') !== 'false';
    this.allowedOrigins = this.parseOrigins(
      this.configService.get<string>('CORS_ORIGINS', ''),
    );
  }

  use(request: Request, _response: Response, next: NextFunction): void {
    if (!this.enabled || SAFE_METHODS.has(request.method)) {
      next();
      return;
    }

    if (this.isPublicAnalyticsEvent(request)) {
      next();
      return;
    }

    this.assertTrustedOrigin(request);
    this.assertDoubleSubmitToken(request);

    next();
  }

  private assertTrustedOrigin(request: Request): void {
    const origin = request.get('origin');
    const referer = request.get('referer');
    const requestOrigin = origin ?? this.getOriginFromReferer(referer);

    if (!requestOrigin) {
      if (process.env.APP_ENV === 'production') {
        throw new ForbiddenException('Missing request origin');
      }

      return;
    }

    if (this.allowedOrigins.includes('*') && process.env.APP_ENV !== 'production') {
      return;
    }

    if (!this.allowedOrigins.includes(requestOrigin)) {
      throw new ForbiddenException('Untrusted request origin');
    }
  }

  private assertDoubleSubmitToken(request: Request): void {
    const cookies = parseCookies(request);
    const csrfCookie = cookies[CSRF_TOKEN_COOKIE];
    const csrfHeader = request.get(CSRF_TOKEN_HEADER);
    const hasAuthCookie = Boolean(
      cookies['hyper_market_access_token'] || cookies['hyper_market_refresh_token'],
    );

    if (!hasAuthCookie) {
      return;
    }

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      throw new ForbiddenException('Invalid CSRF token');
    }
  }

  private isPublicAnalyticsEvent(request: Request): boolean {
    return request.method === 'POST' && request.path === '/api/v1/analytics/event';
  }

  private parseOrigins(origins: string): string[] {
    return origins
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  private getOriginFromReferer(referer?: string): string | undefined {
    if (!referer) {
      return undefined;
    }

    try {
      return new URL(referer).origin;
    } catch {
      return undefined;
    }
  }


}
