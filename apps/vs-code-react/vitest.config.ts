import { defineProject } from 'vitest/config';
import packageJson from './package.json';

export default defineProject({
  plugins: [],
  resolve: {},
  test: {
    name: packageJson.name,
    environment: 'jsdom',
    pool: process.env.CI ? 'forks' : 'threads',
    setupFiles: ['test-setup.ts'],
    coverage: {
      enabled: !!process.env.COLLECT_COVERAGE,
      provider: 'istanbul',
      include: ['src/app/**/*', 'src/state/**/*'],
      exclude: ['src/intl/**/*'],
      reporter: ['html', 'cobertura', 'lcov'],
    },
    retry: process.env.CI ? 1 : 0,
    restoreMocks: true,
  },
});
