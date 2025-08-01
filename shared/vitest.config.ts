import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: [
      'src/**/*.test.ts',
      'src/**/*.spec.ts'
    ],
    exclude: [
      'node_modules/**',
      'dist/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: [
        'src/**/*.ts'
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/index.ts'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  }
});