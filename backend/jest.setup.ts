import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set default test environment variables if not provided
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./test.db';

// Global test setup
beforeAll(async () => {
  // Setup test database or other global test configuration
});

afterAll(async () => {
  // Cleanup after all tests
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment below to hide logs during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};