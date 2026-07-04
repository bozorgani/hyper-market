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

export type TransactionOptions<T> = {
  /** Main operation to execute inside the transaction. */
  execute: (session?: ClientSession) => Promise<T>;
  /**
   * Compensation function called when the main operation fails AFTER some
   * writes were committed in a non-transactional (fallback) execution.
   * Receives the partial result (if any) and should undo side effects.
   *
   * This is only called in the fallback (no-transaction) path when the
   * callback throws after potentially persisting some writes.
   */
  compensate?: (error: unknown) => Promise<void>;
};

@Injectable()
export class DatabaseTransactionService implements OnModuleInit {
  /**
   * Capability flag, populated by the bootstrap probe:
   *   null  => probe has not run yet
   *   false => deployment cannot run transactions (e.g. standalone mongod)
   *   true  => replica set / mongos confirmed
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
        // Ignore abort failures
      }
      this.transactionsSupported = false;
      return false;
    } finally {
      if (session) {
        await session.endSession().catch(() => undefined);
      }
      try {
        await this.connection
          .collection(TRANSACTION_PROBE_COLLECTION)
          .deleteMany({});
      } catch {
        // Ignore cleanup failures
      }
    }
  }

  startSession(): Promise<ClientSession> {
    return this.connection.startSession();
  }

  /**
   * Execute a callback inside a MongoDB transaction (when supported) or
   * without a session (fallback). Identical to the original API.
   */
  async executeInTransaction<T>(
    callback: (session?: ClientSession) => Promise<T>,
  ): Promise<T> {
    return this.executeWithCompensation({ execute: callback });
  }

  /**
   * Execute an operation with optional compensation for the non-transactional
   * fallback path.
   *
   * When transactions are supported, runs in a normal MongoDB transaction.
   * When NOT supported (standalone mongod), runs without a session but:
   *   1. Catches errors from the callback
   *   2. Calls the `compensate` function (if provided) to undo partial writes
   *   3. Re-throws the original error
   *
   * This prevents the "partially committed" data corruption scenario where
   * e.g. an order is created but stock is not reduced because the callback
   * failed halfway through.
   */
  async executeWithCompensation<T>(options: TransactionOptions<T>): Promise<T> {
    const { execute, compensate } = options;

    // ── Transaction path (normal) ──────────────────────────────────────
    if (this.transactionsSupported !== false) {
      const session = await this.startSession();
      let ranToCompletion = false;

      try {
        session.startTransaction();
        const result = await execute(session);
        ranToCompletion = true;
        await session.commitTransaction();
        return result;
      } catch (error) {
        await this.abortTransactionSafely(session);

        if (!ranToCompletion && this.shouldFallbackWithoutTransaction(error)) {
          this.loggerService?.warn(
            '[transactions] Transaction failed; falling back without transaction (single attempt)',
            { error: error instanceof Error ? error.message : String(error) },
          );
          return this.executeFallback(execute, compensate, error);
        }

        throw error;
      } finally {
        await session.endSession();
      }
    }

    // ── Fallback path (no transactions) ────────────────────────────────
    this.loggerService?.warn(
      '[transactions] Executing callback without a transaction (deployment does not support transactions).',
    );
    return this.executeFallback(execute, compensate);
  }

  /**
   * Execute a callback without a transaction. If it fails and a compensation
   * function is provided, attempt to undo partial writes.
   */
  private async executeFallback<T>(
    execute: (session?: ClientSession) => Promise<T>,
    compensate?: (error: unknown) => Promise<void>,
    originalError?: unknown,
  ): Promise<T> {
    try {
      return await execute(undefined);
    } catch (error) {
      if (compensate) {
        try {
          await compensate(error);
          this.loggerService?.warn(
            '[transactions] Fallback execution failed; compensation succeeded. Partial writes were rolled back.',
            {
              error: error instanceof Error ? error.message : String(error),
            },
          );
        } catch (compensationError) {
          this.loggerService?.error(
            '[transactions] CRITICAL: Fallback execution failed AND compensation also failed. ' +
              'Manual data reconciliation may be required.',
            {
              originalError: error instanceof Error ? error.message : String(error),
              compensationError: compensationError instanceof Error ? compensationError.message : String(compensationError),
            },
          );
        }
      } else {
        this.loggerService?.error(
          '[transactions] Fallback execution failed (no compensation provided). ' +
            'Partial writes may exist in the database.',
          {
            error: error instanceof Error ? error.message : String(error),
          },
        );
      }

      throw originalError ?? error;
    }
  }

  private async abortTransactionSafely(session: ClientSession): Promise<void> {
    try {
      await session.abortTransaction();
    } catch {
      // Ignore abort failures
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
