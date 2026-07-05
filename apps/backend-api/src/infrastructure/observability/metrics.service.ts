import { Injectable } from '@nestjs/common';

const HTTP_DURATION_BUCKETS_SECONDS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

type HttpMetricKey = `${string}|${string}|${number}`;

type HistogramState = {
  buckets: number[];
  sum: number;
  count: number;
};

@Injectable()
export class MetricsService {
  private readonly processStartedAt = Date.now();
  private readonly httpRequests = new Map<HttpMetricKey, number>();
  private readonly httpDurations = new Map<HttpMetricKey, HistogramState>();
  private readonly exceptions = new Map<string, number>();

  recordHttpRequest(method: string, path: string, statusCode: number, durationMs: number): void {
    const normalizedPath = this.normalizePath(path);
    const key = this.httpKey(method, normalizedPath, statusCode);
    this.httpRequests.set(key, (this.httpRequests.get(key) ?? 0) + 1);

    const durationSeconds = Math.max(durationMs, 0) / 1000;
    const histogram = this.httpDurations.get(key) ?? {
      buckets: new Array(HTTP_DURATION_BUCKETS_SECONDS.length).fill(0),
      sum: 0,
      count: 0,
    };

    for (let index = 0; index < HTTP_DURATION_BUCKETS_SECONDS.length; index++) {
      if (durationSeconds <= HTTP_DURATION_BUCKETS_SECONDS[index]) {
        histogram.buckets[index] += 1;
      }
    }
    histogram.sum += durationSeconds;
    histogram.count += 1;
    this.httpDurations.set(key, histogram);
  }

  recordException(exceptionName: string, statusCode: number): void {
    const key = `${exceptionName}|${statusCode}`;
    this.exceptions.set(key, (this.exceptions.get(key) ?? 0) + 1);
  }

  getSnapshot() {
    const totalRequests = [...this.httpRequests.values()].reduce((sum, value) => sum + value, 0);
    const totalExceptions = [...this.exceptions.values()].reduce((sum, value) => sum + value, 0);
    const statusBuckets: Record<string, number> = {};

    for (const [key, count] of this.httpRequests.entries()) {
      const [, , status] = key.split('|');
      const statusClass = `${status.charAt(0)}xx`;
      statusBuckets[statusClass] = (statusBuckets[statusClass] ?? 0) + count;
    }

    return {
      uptimeSeconds: Math.round((Date.now() - this.processStartedAt) / 1000),
      totalRequests,
      totalExceptions,
      statusBuckets,
      memory: process.memoryUsage(),
    };
  }

  toPrometheus(): string {
    const lines: string[] = [
      '# HELP hyper_market_process_uptime_seconds Process uptime in seconds.',
      '# TYPE hyper_market_process_uptime_seconds gauge',
      `hyper_market_process_uptime_seconds ${Math.round((Date.now() - this.processStartedAt) / 1000)}`,
      '# HELP hyper_market_http_requests_total Total HTTP requests.',
      '# TYPE hyper_market_http_requests_total counter',
    ];

    for (const [key, count] of this.httpRequests.entries()) {
      const [method, path, status] = key.split('|');
      lines.push(`hyper_market_http_requests_total{method="${method}",path="${path}",status="${status}"} ${count}`);
    }

    lines.push(
      '# HELP hyper_market_http_request_duration_seconds HTTP request duration in seconds.',
      '# TYPE hyper_market_http_request_duration_seconds histogram',
    );

    for (const [key, histogram] of this.httpDurations.entries()) {
      const [method, path, status] = key.split('|');
      for (let index = 0; index < HTTP_DURATION_BUCKETS_SECONDS.length; index++) {
        lines.push(`hyper_market_http_request_duration_seconds_bucket{method="${method}",path="${path}",status="${status}",le="${HTTP_DURATION_BUCKETS_SECONDS[index]}"} ${histogram.buckets[index]}`);
      }
      lines.push(`hyper_market_http_request_duration_seconds_bucket{method="${method}",path="${path}",status="${status}",le="+Inf"} ${histogram.count}`);
      lines.push(`hyper_market_http_request_duration_seconds_sum{method="${method}",path="${path}",status="${status}"} ${histogram.sum}`);
      lines.push(`hyper_market_http_request_duration_seconds_count{method="${method}",path="${path}",status="${status}"} ${histogram.count}`);
    }

    lines.push(
      '# HELP hyper_market_exceptions_total Total exceptions captured by the global exception filter.',
      '# TYPE hyper_market_exceptions_total counter',
    );
    for (const [key, count] of this.exceptions.entries()) {
      const [name, status] = key.split('|');
      lines.push(`hyper_market_exceptions_total{name="${name}",status="${status}"} ${count}`);
    }

    const memory = process.memoryUsage();
    lines.push(
      '# HELP hyper_market_process_memory_bytes Process memory usage in bytes.',
      '# TYPE hyper_market_process_memory_bytes gauge',
      `hyper_market_process_memory_bytes{type="rss"} ${memory.rss}`,
      `hyper_market_process_memory_bytes{type="heapTotal"} ${memory.heapTotal}`,
      `hyper_market_process_memory_bytes{type="heapUsed"} ${memory.heapUsed}`,
      `hyper_market_process_memory_bytes{type="external"} ${memory.external}`,
    );

    return `${lines.join('\n')}\n`;
  }

  private httpKey(method: string, path: string, statusCode: number): HttpMetricKey {
    return `${method.toUpperCase()}|${path}|${statusCode}`;
  }

  private normalizePath(path: string): string {
    const pathname = path.split('?')[0] || '/';
    return pathname
      .replace(/[a-f0-9]{24}/gi, ':id')
      .replace(/\b\d+\b/g, ':number');
  }
}
