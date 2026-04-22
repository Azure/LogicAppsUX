import { defineProject } from 'vitest/config';
import react from '@vitejs/plugin-react';
import packageJson from './package.json';

export default defineProject({
  plugins: [react()],
  test: {
    name: packageJson.name,
    environment: 'happy-dom',
    pool: process.env.CI ? 'forks' : 'threads',
    setupFiles: ['test-setup.ts'],
    coverage: {
      enabled: !!process.env.COLLECT_COVERAGE,
      provider: 'istanbul',
      include: ['src/**/*'],
      reporter: ['html', 'cobertura', 'lcov'],
    },
    retry: process.env.CI ? 1 : 0,
    restoreMocks: true,
  },
});
