/**
 * MongoDB Migration Runner for Hyper Market
 *
 * Lightweight migration system that runs schema/data migrations in order on
 * application startup. It is safe for rolling deployments: a Mongo-backed lock
 * ensures only one process runs migrations while other processes wait/skip.
 */

import { Connection } from 'mongoose';
import { safeCreateIndex } from './migration-utils';

export type Migration = {
  /** Unique sequential identifier (e.g. '0001') */
  id: string;
  /** Human-readable description */
  description: string;
  /**
   * The migration function. Receives the Mongoose connection.
   * Must be idempotent — safe to run multiple times.
   */
  up: (connection: Connection) => Promise<void>;
};

type MigrationRecord = {
  id: string;
  description: string;
  appliedAt: Date;
};

const MIGRATIONS_COLLECTION = '__migrations';
const MIGRATION_LOCK_COLLECTION = '__migration_locks';
const GLOBAL_LOCK_ID = 'global';
const LOCK_TTL_MS = 5 * 60 * 1000;
const LOCK_WAIT_TIMEOUT_MS = 120 * 1000;
const LOCK_POLL_MS = 1000;

export class MigrationRunner {
  private readonly ownerId = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  constructor(private readonly connection: Connection) {}

  /**
   * Run all pending migrations in order.
   */
  async run(migrations: Migration[]): Promise<void> {
    if (migrations.length === 0) return;

    console.log('[MIGRATIONS] START migration runner');
    const releaseLock = await this.acquireLock();

    try {
      await this.runLocked(migrations);
      console.log('[MIGRATIONS] SUCCESS migration runner completed');
    } catch (error) {
      console.error(
        '[MIGRATIONS] FAILED migration runner',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    } finally {
      await releaseLock();
    }
  }

  private async runLocked(migrations: Migration[]): Promise<void> {
    const collection = this.connection.collection(MIGRATIONS_COLLECTION);

    await this.ensureMigrationIndexes(collection);

    const applied = await collection.find({}, { projection: { id: 1 } }).toArray();
    const appliedIds = new Set(applied.map((r) => r.id));
    const sorted = [...migrations].sort((a, b) => a.id.localeCompare(b.id));

    let ran = 0;
    for (const migration of sorted) {
      if (appliedIds.has(migration.id)) {
        console.log(`[MIGRATIONS] SKIPPED ${migration.id}: already applied`);
        continue;
      }

      console.log(`[MIGRATIONS] START ${migration.id}: ${migration.description}`);

      try {
        await migration.up(this.connection);

        const record: MigrationRecord = {
          id: migration.id,
          description: migration.description,
          appliedAt: new Date(),
        };
        await collection.insertOne(record);

        ran++;
        console.log(`[MIGRATIONS] SUCCESS ${migration.id}: ${migration.description}`);
      } catch (error) {
        console.error(
          `[MIGRATIONS] FAILED ${migration.id}: ${migration.description}`,
          error instanceof Error ? error.message : String(error),
        );
        throw error;
      }
    }

    if (ran === 0) {
      console.log('[MIGRATIONS] SKIPPED no pending migrations');
    } else {
      console.log(`[MIGRATIONS] SUCCESS applied ${ran} migration(s)`);
    }
  }

  private async ensureMigrationIndexes(collection: any): Promise<void> {
    const indexes = await collection.indexes();
    const idIndex = indexes.find((index: any) => JSON.stringify(index.key) === JSON.stringify({ id: 1 }));
    if (idIndex?.unique) return;
    if (idIndex?.name && idIndex.name !== '_id_') {
      await collection.dropIndex(idIndex.name);
    }
    await safeCreateIndex(collection, { id: 1 }, { unique: true });
  }

  private async acquireLock(): Promise<() => Promise<void>> {
    const collection: any = this.connection.collection(MIGRATION_LOCK_COLLECTION);
    await safeCreateIndex(collection, { expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => undefined);

    const startedAt = Date.now();
    while (Date.now() - startedAt < LOCK_WAIT_TIMEOUT_MS) {
      const now = new Date();
      const expiresAt = new Date(Date.now() + LOCK_TTL_MS);
      const result = await collection.findOneAndUpdate(
        {
          _id: GLOBAL_LOCK_ID,
          $or: [
            { expiresAt: { $lte: now } },
            { ownerId: this.ownerId },
            { ownerId: { $exists: false } },
          ],
        },
        {
          $set: {
            ownerId: this.ownerId,
            expiresAt,
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
          },
        },
        { upsert: true, returnDocument: 'after' },
      );

      if (result?.ownerId === this.ownerId) {
        console.log('[MIGRATIONS] SUCCESS acquired migration lock');
        return async () => {
          await collection.deleteOne({ _id: GLOBAL_LOCK_ID, ownerId: this.ownerId });
          console.log('[MIGRATIONS] SUCCESS released migration lock');
        };
      }

      console.log('[MIGRATIONS] SKIPPED lock held by another process; waiting...');
      await this.sleep(LOCK_POLL_MS);
    }

    throw new Error('Timed out waiting for migration lock');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
