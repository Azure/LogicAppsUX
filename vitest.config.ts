import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['libs/*', 'apps/vs-code-designer/vitest.config.ts', 'apps/vs-code-react/vitest.config.ts'],
  },
});
