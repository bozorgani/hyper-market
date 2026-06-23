import { Body, Controller, Get, Post } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { AnalyticsService } from './analytics.service';
import { AnalyticsEventType } from './schemas/event.schema';

type TrackEventBody = {
  userId?: string | null;
  type: AnalyticsEventType;
  metadata?: Record<string, unknown>;
  sessionId?: string | null;
  deviceId?: string | null;
};

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('event')
  @Public()
  trackEvent(@Body() body: TrackEventBody) {
    this.analyticsService.trackEvent(body);
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
}
