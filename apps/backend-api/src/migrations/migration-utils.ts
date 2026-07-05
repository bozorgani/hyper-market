import { Collection } from 'mongodb';

type IndexKey = Record<string, 1 | -1 | 'text' | 'hashed'>;
type IndexOptions = {
  name?: string;
  unique?: boolean;
  sparse?: boolean;
  expireAfterSeconds?: number;
  partialFilterExpression?: Record<string, unknown>;
};

type ExistingIndex = {
  name?: string;
  key: Record<string, unknown>;
  unique?: boolean;
  sparse?: boolean;
  expireAfterSeconds?: number;
  partialFilterExpression?: Record<string, unknown>;
};

export async function safeCreateIndex(
  collection: Collection,
  key: IndexKey,
  options: IndexOptions = {},
): Promise<void> {
  const indexes = (await collection.indexes()) as ExistingIndex[];
  const existingByName = options.name
    ? indexes.find((index) => index.name === options.name)
    : undefined;
  const existingByKey = indexes.find((index) => sameKey(index.key, key));

  if (existingByKey && isCompatibleIndex(existingByKey, options)) {
    console.log(
      `[MIGRATIONS] SKIPPED index ${collectionName(collection)}.${existingByKey.name} already exists`,
    );
    return;
  }

  if (existingByKey?.name && existingByKey.name !== '_id_') {
    console.log(
      `[MIGRATIONS] Recreating incompatible index ${collectionName(collection)}.${existingByKey.name}`,
    );
    await collection.dropIndex(existingByKey.name);
  } else if (existingByName?.name && existingByName.name !== '_id_') {
    console.log(
      `[MIGRATIONS] Recreating conflicting index name ${collectionName(collection)}.${existingByName.name}`,
    );
    await collection.dropIndex(existingByName.name);
  }

  try {
    await collection.createIndex(key, options);
    console.log(
      `[MIGRATIONS] SUCCESS index ${collectionName(collection)}.${options.name ?? JSON.stringify(key)} ready`,
    );
  } catch (error) {
    if (!isIndexConflict(error)) throw error;

    const retryIndexes = (await collection.indexes()) as ExistingIndex[];
    const conflictingByKey = retryIndexes.find((index) => sameKey(index.key, key));
    if (conflictingByKey && isCompatibleIndex(conflictingByKey, options)) {
      console.log(
        `[MIGRATIONS] SKIPPED index ${collectionName(collection)}.${conflictingByKey.name} created concurrently`,
      );
      return;
    }

    if (conflictingByKey?.name && conflictingByKey.name !== '_id_') {
      await collection.dropIndex(conflictingByKey.name);
      await collection.createIndex(key, options);
      return;
    }

    throw error;
  }
}

export async function safeDropIndex(collection: Collection, name: string): Promise<void> {
  const indexes = (await collection.indexes()) as ExistingIndex[];
  if (!indexes.some((index) => index.name === name)) {
    console.log(`[MIGRATIONS] SKIPPED drop missing index ${collectionName(collection)}.${name}`);
    return;
  }
  await collection.dropIndex(name);
  console.log(`[MIGRATIONS] SUCCESS dropped index ${collectionName(collection)}.${name}`);
}

function sameKey(left: Record<string, unknown>, right: Record<string, unknown>): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isCompatibleIndex(index: ExistingIndex, options: IndexOptions): boolean {
  return (
    Boolean(index.unique) === Boolean(options.unique) &&
    Boolean(index.sparse) === Boolean(options.sparse) &&
    normalizeNumber(index.expireAfterSeconds) === normalizeNumber(options.expireAfterSeconds) &&
    JSON.stringify(index.partialFilterExpression ?? null) ===
      JSON.stringify(options.partialFilterExpression ?? null)
  );
}

function normalizeNumber(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}

function isIndexConflict(error: unknown): boolean {
  const code = (error as { code?: number }).code;
  const message = error instanceof Error ? error.message : String(error);
  return (
    code === 85 ||
    code === 86 ||
    message.includes('Index already exists') ||
    message.includes('same name as the requested index') ||
    message.includes('already exists with a different name')
  );
}

function collectionName(collection: Collection): string {
  return (collection as any).collectionName ?? (collection as any).namespace ?? 'unknown';
}
