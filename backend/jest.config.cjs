/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/controllers/*.test.ts',
    '**/middleware/*.test.ts'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/step-definitions/',
    '/test-utils/',
    'integration.test.ts'
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/db/seed.ts',
    '!src/**/*.steps.ts',
    '!src/test-utils/**'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 10000,
  verbose: true
};