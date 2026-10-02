import { defineProject } from 'vitest/config';
import react from '@vitejs/plugin-react';
import packageJson from './package.json';
import { coverageDefaults } from '../shared-test-utils/vitestCoverage';

export default defineProject({
  plugins: [react()],
  test: {
    name: packageJson.name,
    environment: 'jsdom',
    setupFiles: ['test-setup.ts'],
    coverage: {
      ...coverageDefaults,
      enabled: true,
      provider: 'istanbul',
      reporter: ['html', 'cobertura', 'lcov'],
    },
    restoreMocks: true,
  },
});
