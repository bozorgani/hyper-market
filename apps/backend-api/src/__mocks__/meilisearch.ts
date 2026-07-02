// Manual Jest mock for the `meilisearch` ESM package.
// Unit specs that transitively import ProductsService pull in SearchIndexer,
// which does `require('meilisearch')`. Jest's default transformIgnorePatterns
// skips node_modules, so the ESM build cannot be parsed. This CJS/TS stub lets
// those specs load without an ESM transformer. SearchIndexer is mocked at the
// DI level in specs, so these methods are never actually exercised here.

class FakeIndex {
  addDocuments = async () => ({ taskUid: 0 });
  updateDocuments = async () => ({ taskUid: 0 });
  deleteDocument = async () => ({ taskUid: 0 });
  deleteAllDocuments = async () => ({ taskUid: 0 });
  search = async () => ({ hits: [], estimatedTotalHits: 0 });
  updateSettings = async () => ({ taskUid: 0 });
  updateFilterableAttributes = async () => ({ taskUid: 0 });
}

class Meilisearch {
  indexes: Record<string, FakeIndex> = {};

  constructor(_options?: { host: string; apiKey?: string }) {}

  index(name: string): FakeIndex {
    this.indexes[name] = this.indexes[name] ?? new FakeIndex();
    return this.indexes[name];
  }
}

export { Meilisearch };
export default { Meilisearch };
