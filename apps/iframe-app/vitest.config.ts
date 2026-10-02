import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import packageJson from './package.json';
import { coverageDefaults } from '../../libs/shared-test-utils/vitestCoverage';

export default defineConfig({
  plugins: [react()],
  test: {
    name: packageJson.name,
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts', '../../libs/shared-test-utils/fluentui-react-icons-mock.ts'],
    root: './',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      ...coverageDefaults,
      enabled: true,
      provider: 'istanbul',
      reporter: ['html', 'cobertura', 'lcov'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
