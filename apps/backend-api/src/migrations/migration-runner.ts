/**
 * MongoDB Migration Runner for Hyper Market
 *
 * Lightweight migration system that runs schema/data migrations
 * in order on application startup. Each migration is an idempotent
 * function tracked in the `__migrations` collection.
 *
 * Usage:
 *   1. Create a new file in `src/migrations/` (e.g. `0002-add-user-indexes.ts`)
 *   2. Export a Migration object with `id`, `description`, and `up()` function
 *   3. Register it in `src/migrations/index.ts`
 *   4. Migrations run automatically on app startup (or via CLI: npx nest start --entryFile migrate)
 *
 * Design decisions:
 *   - No external packages (mongosh, migrate-mongo, etc.) — keeps the stack lean
 *   - Uses the existing Mongoose connection from NestJS DI
 *   - Migrations are tracked in `__migrations` collection (not files on disk)
 *   - Each migration is idempotent — safe to re-run
 *   - No `down()` support by design — production rollbacks are data-specific
 *     and should be handled via dedicated one-off scripts
 */

import { Connection } from 'mongoose';

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

export class MigrationRunner {
  constructor(private readonly connection: Connection) {}

  /**
   * Run all pending migrations in order.
   */
  async run(migrations: Migration[]): Promise<void> {
    if (migrations.length === 0) return;

    const collection = this.connection.collection(MIGRATIONS_COLLECTION);

    // Ensure unique index on migration id
    await collection.createIndex({ id: 1 }, { unique: true });

    // Get already-applied migrations
    const applied = await collection.find({}, { projection: { id: 1 } }).toArray();
    const appliedIds = new Set(applied.map((r) => r.id));

    // Sort migrations by id
    const sorted = [...migrations].sort((a, b) => a.id.localeCompare(b.id));

    let ran = 0;
    for (const migration of sorted) {
      if (appliedIds.has(migration.id)) {
        continue;
      }

      console.log(
        `[MIGRATIONS] Running ${migration.id}: ${migration.description}...`,
      );

      try {
        await migration.up(this.connection);

        const record: MigrationRecord = {
          id: migration.id,
          description: migration.description,
          appliedAt: new Date(),
        };
        await collection.insertOne(record);

        ran++;
        console.log(
          `[MIGRATIONS] ✅ ${migration.id}: ${migration.description} — applied successfully`,
        );
      } catch (error) {
        console.error(
          `[MIGRATIONS] ❌ ${migration.id}: ${migration.description} — FAILED`,
          error instanceof Error ? error.message : String(error),
        );
        throw error; // Stop on first failure
      }
    }

    if (ran === 0) {
      console.log('[MIGRATIONS] All migrations already applied — nothing to do.');
    } else {
      console.log(`[MIGRATIONS] Applied ${ran} migration(s).`);
    }
  }
}
