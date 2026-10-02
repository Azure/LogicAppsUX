import { defineProject } from 'vitest/config';
import react from '@vitejs/plugin-react';
import packageJson from './package.json';
import { coverageDefaults } from '../shared-test-utils/vitestCoverage';

export default defineProject({
  plugins: [react()],
  test: {
    name: packageJson.name,
    globals: true,
    environment: 'jsdom',
    setupFiles: ['test-setup.ts', '../shared-test-utils/fluentui-react-icons-mock.ts'],
    coverage: {
      ...coverageDefaults,
      enabled: true,
      provider: 'istanbul',
      reporter: ['html', 'cobertura', 'lcov'],
    },
    typecheck: { enabled: true },
    restoreMocks: true,
  },
});
