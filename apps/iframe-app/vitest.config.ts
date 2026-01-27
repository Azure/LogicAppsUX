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
    setupFiles: './src/test/setup.ts',
    root: './',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: { enabled: true, provider: 'istanbul', include: ['src/**/*'], reporter: ['html', 'cobertura', 'lcov'] },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
