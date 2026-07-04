import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { HealthIndicator, HealthIndicatorResult } from '../health-indicators.interface';

@Injectable()
export class DatabaseHealthIndicator implements HealthIndicator {
  readonly name = 'database';

  constructor(@InjectConnection() private readonly connection: Connection) {}

  async check(): Promise<HealthIndicatorResult> {
    const start = Date.now();
    try {
      const adminDb = this.connection.db?.admin?.();
      if (adminDb) {
        await adminDb.ping();
      } else {
        if (this.connection.db) {
          await this.connection.db.listCollections().toArray();
        } else {
          // If no DB reference, just check the readyState
          if (this.connection.readyState !== 1) {
            throw new Error('Database not connected');
          }
        }
      }
      return {
        status: 'ok',
        latencyMs: Date.now() - start,
        meta: {
          host: this.connection.host,
          name: this.connection.name,
          readyState: this.connection.readyState,
        },
      };
    } catch (error) {
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
        meta: { readyState: this.connection.readyState },
      };
    }
  }
}
