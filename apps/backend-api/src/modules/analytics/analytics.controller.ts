import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { TokenService } from '../../infrastructure/security/token.service';
import { Public } from '../auth/decorators/public.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { AnalyticsService } from './analytics.service';
import { TrackEventDto } from './dto/track-event.dto';

const ACCESS_TOKEN_COOKIE = 'hyper_market_access_token';

@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly tokenService: TokenService,
  ) {}

  @Post('event')
  @Public()
  @Throttle({ default: { limit: 600, ttl: 60000 } })
  trackEvent(@Body() body: TrackEventDto, @Req() request: Request) {
    const authenticatedUser = this.getAuthenticatedUserIfPresent(request);

    this.analyticsService.trackEvent({
      type: body.type,
      metadata: this.sanitizeMetadata(body.metadata),
      userId: authenticatedUser?.sub ?? null,
      sessionId: authenticatedUser?.sessionId ?? body.sessionId ?? null,
      deviceId: authenticatedUser?.deviceId ?? body.deviceId ?? null,
    });

    return { success: true };
  }

  @Get('dashboard')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  getDashboard() {
    return this.analyticsService.getDashboard();
  }

  @Get('revenue')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  getRevenue() {
    return this.analyticsService.getRevenueMetrics();
  }

  @Get('products')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  getProducts() {
    return this.analyticsService.getProductMetrics();
  }

  @Get('search')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  getSearch() {
    return this.analyticsService.getSearchMetrics();
  }

  @Get('funnel')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  getFunnel() {
    return this.analyticsService.getFunnelMetrics();
  }

  private getAuthenticatedUserIfPresent(request: Request): JwtPayload | null {
    const token = this.getBearerToken(request) ?? this.getCookieValue(request, ACCESS_TOKEN_COOKIE);
    if (!token) {
      return null;
    }

    try {
      return this.tokenService.verifyAccessToken(token);
    } catch {
      return null;
    }
  }

  private getBearerToken(request: Request): string | null {
    const authorization = request.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return null;
    }

    return authorization.slice('Bearer '.length).trim() || null;
  }

  private getCookieValue(request: Request, name: string): string | undefined {
    const cookieHeader = request.headers.cookie;
    if (!cookieHeader) {
      return undefined;
    }

    const cookies = cookieHeader.split(';');
    for (const cookie of cookies) {
      const [rawKey, ...rawValue] = cookie.trim().split('=');
      if (rawKey === name) {
        return decodeURIComponent(rawValue.join('='));
      }
    }

    return undefined;
  }

  private sanitizeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> {
    const sanitized = this.removePrototypeKeys(metadata ?? {});
    const serialized = JSON.stringify(sanitized);
    const maxMetadataBytes = Number(process.env.ANALYTICS_MAX_METADATA_BYTES ?? 4096);

    if (Buffer.byteLength(serialized, 'utf8') <= maxMetadataBytes) {
      return sanitized;
    }

    return {
      truncated: true,
      originalSizeBytes: Buffer.byteLength(serialized, 'utf8'),
    };
  }

  private removePrototypeKeys(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (key === '__proto__' || key === 'prototype' || key === 'constructor') {
        continue;
      }

      output[key] = item;
    }

    return output;
  }
}
