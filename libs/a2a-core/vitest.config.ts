import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    exclude: ['**/node_modules/**', '**/dist/**', '**/examples/**', '**/*.spec.ts'],
    setupFiles: ['./src/react/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.d.ts', '**/*.config.ts', '**/index.ts'],
      thresholds: {
        lines: 70,
        functions: 85,
        branches: 70,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      '\\.(css|less|scss|sass)$': resolve(__dirname, './src/react/test/css-modules-mock.js'),
    },
  },
  css: {
    modules: {
      // Return class names as-is without hashing, matching tsup config
      generateScopedName: '[local]',
    },
  },
});
