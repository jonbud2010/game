import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    
    // Performance optimizations
    pool: 'threads',
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads: 3, // Limited due to SQLite file locking
        useAtomics: true
      }
    },
    
    // Faster test execution
    logLevel: 'error',
    reporter: 'basic',
    
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
    // Optimized timeouts
    testTimeout: 5000, // Reduced from 10s
    hookTimeout: 15000 // Reduced from 30s
  },
  resolve: {
    alias: {
      '@football-tcg/shared': path.resolve(__dirname, '../shared/dist/index.js')
    }
  },
  esbuild: {
    target: 'node18'
  }
});