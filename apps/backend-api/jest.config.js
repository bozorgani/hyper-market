module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // `meilisearch` ships ESM; map it to a CJS stub so specs that transitively
    // import ProductsService/SearchIndexer can load under Jest's default config.
    '^meilisearch$': '<rootDir>/__mocks__/meilisearch.ts',
  },
};