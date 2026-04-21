import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import packageJson from './package.json';

export default defineConfig({
  plugins: [react()],
  test: {
    name: packageJson.name,
    globals: true,
    environment: 'jsdom',
    pool: 'forks',
    setupFiles: './src/test/setup.ts',
    root: './',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      enabled: !!process.env.COLLECT_COVERAGE,
      provider: 'istanbul',
      include: ['src/**/*'],
      reporter: ['html', 'cobertura', 'lcov'],
    },
    retry: process.env.CI ? 1 : 0,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
