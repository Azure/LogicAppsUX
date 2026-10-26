import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['vite-plugins/__test__/*.spec.ts'],
  },
});
