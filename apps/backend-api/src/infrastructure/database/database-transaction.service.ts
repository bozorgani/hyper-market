import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ClientSession, Connection } from 'mongoose';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class DatabaseTransactionService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly loggerService?: LoggerService,
  ) {}

  startSession(): Promise<ClientSession> {
    return this.connection.startSession();
  }

  async executeInTransaction<T>(
    callback: (session?: ClientSession) => Promise<T>,
  ): Promise<T> {
    const session = await this.startSession();

    try {
      session.startTransaction();
      const result = await callback(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await this.abortTransactionSafely(session);

      if (this.shouldFallbackWithoutTransaction(error)) {
        this.loggerService?.warn('MongoDB transaction failed; falling back without transaction in non-production environment', {
          error: error instanceof Error ? error.message : String(error),
        });
        return callback(undefined);
      }

      throw error;
    } finally {
      await session.endSession();
    }
  }

  private async abortTransactionSafely(session: ClientSession): Promise<void> {
    try {
      await session.abortTransaction();
    } catch {
      // Ignore abort failures; the original transaction error is more important.
    }
  }

  private shouldFallbackWithoutTransaction(error: unknown): boolean {
    if (process.env.APP_ENV === 'production') {
      return false;
    }

    if (process.env.MONGODB_TRANSACTION_FALLBACK_ENABLED === 'false') {
      return false;
    }

    const message = error instanceof Error ? error.message : String(error);
    return [
      'Transaction numbers are only allowed on a replica set member or mongos',
      'This MongoDB deployment does not support retryable writes',
      'Transaction numbers',
      'replica set member or mongos',
    ].some((fragment) => message.includes(fragment));
  }
}
