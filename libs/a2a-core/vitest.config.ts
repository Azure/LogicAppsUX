import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    exclude: ['**/node_modules/**', '**/dist/**', '**/examples/**', '**/*.spec.ts'],
    setupFiles: ['./src/react/test/setup.ts'],
    coverage: {
      enabled: true,
      provider: 'istanbul',
      include: ['src/**/*'],
      reporter: ['html', 'cobertura', 'lcov'],
      exclude: ['node_modules/', 'dist/', '**/*.d.ts', '**/*.config.ts', '**/index.ts'],
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
