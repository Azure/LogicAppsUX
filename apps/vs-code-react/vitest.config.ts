import { defineProject } from 'vitest/config';
import packageJson from './package.json';

export default defineProject({
  plugins: [],
  resolve: {},
  test: {
    name: packageJson.name,
    environment: 'jsdom',
    setupFiles: ['test-setup.ts'],
    coverage: {
      enabled: true,
      provider: 'istanbul',
      include: ['src/app/**/*', 'src/state/**/*'],
      reporter: ['html', 'cobertura', 'lcov'],
    },
    restoreMocks: true,
  },
});
