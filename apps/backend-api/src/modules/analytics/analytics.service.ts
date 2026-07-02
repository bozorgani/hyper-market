import { Injectable } from '@nestjs/common';
import { AnalyticsRepository } from './analytics.repository';
import { AnalyticsEvent, AnalyticsEventType } from './schemas/event.schema';

type TrackEventInput = {
  userId?: string | null;
  type: AnalyticsEventType;
  metadata?: Record<string, unknown>;
  sessionId?: string | null;
  deviceId?: string | null;
  dedupeKey?: string | null;
};

@Injectable()
export class AnalyticsService {
  constructor(private readonly analyticsRepository: AnalyticsRepository) {}

  trackEvent(input: TrackEventInput): void {
    void this.analyticsRepository
      .create({
        userId: input.userId ?? null,
        type: input.type,
        metadata: input.metadata ?? {},
        sessionId: input.sessionId ?? null,
        deviceId: input.deviceId ?? null,
        dedupeKey: input.dedupeKey ?? null,
        timestamp: new Date(),
      })
      .catch(() => undefined);
  }

  trackPageView(input: Omit<TrackEventInput, 'type'>): void {
    this.trackEvent({ ...input, type: AnalyticsEventType.PRODUCT_VIEW });
  }

  trackSearch(input: Omit<TrackEventInput, 'type'> & { query: string; resultsCount?: number }): void {
    this.trackEvent({
      ...input,
      type: AnalyticsEventType.SEARCH_QUERY,
      metadata: {
        ...(input.metadata ?? {}),
        query: input.query,
        resultsCount: input.resultsCount ?? null,
      },
    });
  }

  trackPurchase(input: Omit<TrackEventInput, 'type'> & { orderId: string; amount: number }): void {
    this.trackEvent({
      ...input,
      type: AnalyticsEventType.PAYMENT_SUCCESS,
      metadata: {
        ...(input.metadata ?? {}),
        orderId: input.orderId,
        amount: input.amount,
      },
    });
  }

  async getDashboard() {
    const [eventCounts, activeUsers, revenue, products, search, funnel] = await Promise.all([
      this.getEventCounts(),
      this.analyticsRepository.countDistinctUsers(),
      this.getRevenueMetrics(),
      this.getProductMetrics(),
      this.getSearchMetrics(),
      this.getFunnelMetrics(),
    ]);

    return {
      eventCounts,
      activeUsers,
      revenue,
      products,
      search,
      funnel,
    };
  }

  async getRevenueMetrics() {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now);
    monthStart.setMonth(now.getMonth() - 1);

    const [dailyRevenue, weeklyRevenue, monthlyRevenue, revenueByDay] = await Promise.all([
      this.sumRevenueSince(dayStart),
      this.sumRevenueSince(weekStart),
      this.sumRevenueSince(monthStart),
      this.analyticsRepository.aggregate([
        { $match: { type: AnalyticsEventType.PAYMENT_SUCCESS } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            revenue: { $sum: { $ifNull: ['$metadata.amount', 0] } },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 30 },
      ]),
    ]);

    return { dailyRevenue, weeklyRevenue, monthlyRevenue, revenueByDay };
  }

  async getProductMetrics() {
    const [mostViewed, mostAddedToCart] = await Promise.all([
      this.groupByProduct(AnalyticsEventType.PRODUCT_VIEW),
      this.groupByProduct(AnalyticsEventType.ADD_TO_CART),
    ]);

    return {
      mostViewed,
      mostAddedToCart,
      conversionRatePerProduct: mostViewed.map((viewed) => {
        const added = mostAddedToCart.find((item) => item.productId === viewed.productId);
        return {
          productId: viewed.productId,
          views: viewed.count,
          addToCart: added?.count ?? 0,
          conversionRate: viewed.count ? Number((((added?.count ?? 0) / viewed.count) * 100).toFixed(2)) : 0,
        };
      }),
    };
  }

  async getSearchMetrics() {
    const topSearchQueries = await this.analyticsRepository.aggregate<{
      query: string;
      count: number;
      noResultCount: number;
    }>([
      { $match: { type: AnalyticsEventType.SEARCH_QUERY, 'metadata.query': { $ne: null } } },
      {
        $group: {
          _id: '$metadata.query',
          count: { $sum: 1 },
          noResultCount: {
            $sum: { $cond: [{ $eq: ['$metadata.resultsCount', 0] }, 1, 0] },
          },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 20 },
      { $project: { _id: 0, query: '$_id', count: 1, noResultCount: 1 } },
    ]);

    return {
      topSearchQueries,
      noResultSearches: topSearchQueries.filter((item) => item.noResultCount > 0),
      trendingSearches: topSearchQueries.slice(0, 10),
    };
  }

  async getFunnelMetrics() {
    const [productViews, addToCart, checkoutStarts, paymentSuccess] = await Promise.all([
      this.analyticsRepository.countByType(AnalyticsEventType.PRODUCT_VIEW),
      this.analyticsRepository.countByType(AnalyticsEventType.ADD_TO_CART),
      this.analyticsRepository.countByType(AnalyticsEventType.CHECKOUT_START),
      this.analyticsRepository.countByType(AnalyticsEventType.PAYMENT_SUCCESS),
    ]);

    return {
      productViews,
      addToCart,
      checkoutStarts,
      paymentSuccess,
      steps: [
        { name: 'View Product', count: productViews },
        { name: 'Add to Cart', count: addToCart },
        { name: 'Checkout', count: checkoutStarts },
        { name: 'Payment Success', count: paymentSuccess },
      ],
    };
  }

  private async getEventCounts() {
    return this.analyticsRepository.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
  }

  private async sumRevenueSince(date: Date): Promise<number> {
    const result = await this.analyticsRepository.aggregate<{ total: number }>([
      { $match: { type: AnalyticsEventType.PAYMENT_SUCCESS, timestamp: { $gte: date } } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$metadata.amount', 0] } } } },
    ]);

    return result[0]?.total ?? 0;
  }

  private async groupByProduct(type: AnalyticsEventType): Promise<Array<{ productId: string; count: number }>> {
    return this.analyticsRepository.aggregate([
      { $match: { type, 'metadata.productId': { $ne: null } } },
      { $group: { _id: '$metadata.productId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
      { $project: { _id: 0, productId: '$_id', count: 1 } },
    ]);
  }
}
