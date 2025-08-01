import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'src/**/*.test.ts',
      'src/**/*.spec.ts'
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      'src/test-utils/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: [
        'src/**/*.ts'
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/index.ts',
        'src/db/seed.ts',
        'src/**/*.steps.ts',
        'src/test-utils/**'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    },
    testTimeout: 10000,
    hookTimeout: 30000
  },
  resolve: {
    alias: {
      '@football-tcg/shared': '../shared/src'
    }
  }
});