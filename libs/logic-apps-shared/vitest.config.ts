import { defineConfig } from 'vitest/config';
import packageJson from './package.json';

export default defineConfig({
  test: {
    name: packageJson.name,
    globals: true,
    environment: 'happy-dom',
    pool: process.env.CI ? 'vmThreads' : 'threads',
    isolate: false,
    setupFiles: ['../shared-test-utils/fluentui-react-icons-mock.ts', 'test-setup.ts'],
    deps: {
      optimizer: {
        ssr: {
          enabled: true,
        },
      },
    },
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
