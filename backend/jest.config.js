export default {
  testEnvironment: 'node',
  transform: {},
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  testTimeout: 30000, // Increased from 10000ms to 30000ms for MongoDB operations
  globalSetup: './src/__tests__/setup/globalSetup.js',
  globalTeardown: './src/__tests__/setup/globalTeardown.js',
  maxWorkers: 1 // Run tests serially to avoid MongoDB connection conflicts
};
