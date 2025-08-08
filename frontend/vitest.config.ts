import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Use Vite's cacheDir instead of deprecated cache.dir
  cacheDir: 'node_modules/.vite',
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    
    // Performance optimizations
    pool: 'threads',
    poolOptions: {
      threads: {
        minThreads: 2,
        maxThreads: 4,
        useAtomics: true
      }
    },
    
    // Reduce output noise for faster execution
    logLevel: 'error',
    reporter: 'basic',
    
    // Updated dependency optimizations (no more deprecation warnings)
    deps: {
      optimizer: {
        web: {
          enabled: true,
          include: [
            // Inline workspace dependencies for faster resolution
            '@football-tcg/shared',
            // Inline testing libraries
            '@testing-library/react',
            '@testing-library/dom',
            '@testing-library/jest-dom'
          ]
        }
      }
    },
    
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'src/**/*.spec.ts',
      'src/**/*.spec.tsx'
    ],
    exclude: [
      'node_modules/**',
      'dist/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: [
        'src/**/*.{ts,tsx}'
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/vite-env.d.ts'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': '/src',
      '@football-tcg/shared': '../shared/src'
    }
  }
});