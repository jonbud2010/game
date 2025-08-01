/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/*.integration.test.ts'
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.integration.setup.ts'],
  globalSetup: '<rootDir>/jest.integration.globalSetup.ts',
  globalTeardown: '<rootDir>/jest.integration.globalTeardown.ts',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/db/seed.ts',
    '!src/**/*.steps.ts',
    '!src/test-utils/**',
    '!src/**/*.test.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 30000, // Längere Timeouts für Integration Tests
  verbose: true,
  // Für Integration Tests - real database, keine Mocks
  clearMocks: false,
  restoreMocks: false
};