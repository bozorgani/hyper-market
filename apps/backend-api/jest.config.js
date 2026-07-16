module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: 'coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // `meilisearch` ships ESM; map it to a CJS stub so specs that transitively
    // import ProductsService/SearchIndexer can load under Jest's default config.
    '^meilisearch$': '<rootDir>/src/__mocks__/meilisearch.ts',
  },
};