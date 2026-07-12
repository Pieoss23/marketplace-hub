/** @type {import('jest').Config} */
module.exports = {
  rootDir: '.',
  testRegex: '.*\\.(spec|e2e-spec)\\.ts$',
  // e2e specs share one real Postgres database with table-wide cleanup in
  // afterEach; running test files in parallel workers lets one file's
  // cleanup delete rows another file's e2e-spec is still using (observed as
  // intermittent foreign key violations). Serial execution removes the race.
  maxWorkers: 1,
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleFileExtensions: ['js', 'json', 'ts'],
  moduleNameMapper: {
    '^@marketplace-hub/domain$': '<rootDir>/../../packages/domain/src/index.ts',
    '^@marketplace-hub/contracts$': '<rootDir>/../../packages/contracts/src/index.ts',
    '^@marketplace-hub/connector-sdk$': '<rootDir>/../../packages/connector-sdk/src/index.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
};
