import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ClientSession, Connection } from 'mongoose';
import { LoggerService } from '../logger/logger.service';

const UNSUPPORTED_TRANSACTION_FRAGMENTS = [
  'Transaction numbers are only allowed on a replica set member or mongos',
  'This MongoDB deployment does not support retryable writes',
  'Transaction numbers',
  'replica set member or mongos',
];

const TRANSACTION_PROBE_COLLECTION = '__transaction_probe__';

@Injectable()
export class DatabaseTransactionService implements OnModuleInit {
  /**
   * Capability flag, populated by the bootstrap probe:
   *   null  => probe has not run yet
   *   false => deployment cannot run transactions (e.g. standalone mongod)
   *   true  => replica set / mongos confirmed
   *
   * When false, executeInTransaction skips the doomed start -> fail -> re-run
   * cycle and runs the callback once without a session, so the lack of
   * atomicity is surfaced loudly instead of silently masking race conditions.
   */
  private transactionsSupported: boolean | null = null;

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly loggerService?: LoggerService,
  ) {}

  async onModuleInit(): Promise<void> {
    const supported = await this.probeTransactionSupport();

    if (!supported) {
      const isProduction = process.env.APP_ENV === 'production';
      const fallbackExplicitlyEnabled =
        process.env.MONGODB_TRANSACTION_FALLBACK_ENABLED === 'true';

      // Fail fast in production: atomicity is mandatory and running without it
      // hides production-only race conditions until they hit real traffic.
      if (isProduction && !fallbackExplicitlyEnabled) {
        throw new Error(
          '[transactions] FATAL: MongoDB transactions are not supported in this ' +
            'environment. Atomicity is mandatory in production — deploy a MongoDB ' +
            'replica set (or set MONGODB_TRANSACTION_FALLBACK_ENABLED=true to override).',
        );
      }

      this.loggerService?.error(
        '[transactions] MongoDB transactions are NOT supported in this environment; ' +
          'transactional code paths run WITHOUT atomicity (fallback active). This ' +
          'masks production-only race conditions. Run a replica set (mongod --replSet rs0) ' +
          'in dev and staging.',
        { appEnv: process.env.APP_ENV ?? 'development' },
      );
      return;
    }

    this.loggerService?.info(
      '[transactions] MongoDB transactions are supported; atomicity enabled.',
    );
  }

  isTransactionSupported(): boolean | null {
    return this.transactionsSupported;
  }

  /**
   * Probes whether the connected deployment can actually run a transaction.
   * Used at bootstrap to surface (loudly) environments where atomicity is
   * silently dropped.
   */
  async probeTransactionSupport(): Promise<boolean> {
    let session: ClientSession | null = null;
    try {
      session = await this.connection.startSession();
      session.startTransaction();
      await this.connection
        .collection(TRANSACTION_PROBE_COLLECTION)
        .insertOne({ __probe__: true, at: new Date() }, { session });
      await session.commitTransaction();
      this.transactionsSupported = true;
      return true;
    } catch {
      try {
        if (session) {
          await session.abortTransaction();
        }
      } catch {
        // Ignore abort failures; the original probe error is what matters.
      }
      this.transactionsSupported = false;
      return false;
    } finally {
      if (session) {
        await session.endSession().catch(() => undefined);
      }
      // Best-effort cleanup of the probe document.
      try {
        await this.connection
          .collection(TRANSACTION_PROBE_COLLECTION)
          .deleteMany({});
      } catch {
        // Ignore cleanup failures.
      }
    }
  }

  startSession(): Promise<ClientSession> {
    return this.connection.startSession();
  }

  async executeInTransaction<T>(
    callback: (session?: ClientSession) => Promise<T>,
  ): Promise<T> {
    // Fast path: we already know this deployment cannot run transactions.
    // Run the callback once, without a session, to avoid the start -> fail ->
    // re-run duplication that the fallback path would otherwise cause.
    if (this.transactionsSupported === false) {
      this.loggerService?.warn(
        '[transactions] executing callback without a transaction (deployment does ' +
          'not support transactions).',
      );
      return callback(undefined);
    }

    const session = await this.startSession();
    let ranToCompletion = false;

    try {
      session.startTransaction();
      const result = await callback(session);
      ranToCompletion = true;
      await session.commitTransaction();
      return result;
    } catch (error) {
      await this.abortTransactionSafely(session);

      // Only re-run the callback (without a transaction) when it never reached
      // completion — its writes were inside the now-aborted transaction, so
      // re-running is safe. If it completed but the commit failed, re-running
      // would duplicate side effects, so we surface the original error instead.
      if (!ranToCompletion && this.shouldFallbackWithoutTransaction(error)) {
        this.loggerService?.warn(
          'MongoDB transaction failed; falling back without transaction (single attempt)',
          { error: error instanceof Error ? error.message : String(error) },
        );
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
    return UNSUPPORTED_TRANSACTION_FRAGMENTS.some((fragment) =>
      message.includes(fragment),
    );
  }
}
