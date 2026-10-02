import { defineProject } from 'vitest/config';
import packageJson from './package.json';
import { coverageDefaults, coverageFileGlob, coveragePathEnd } from '../../libs/shared-test-utils/vitestCoverage';

export default defineProject({
  plugins: [],
  resolve: {},
  test: {
    name: packageJson.name,
    environment: 'jsdom',
    setupFiles: ['test-setup.ts'],
    coverage: {
      ...coverageDefaults,
      enabled: true,
      provider: 'istanbul',
      include: [`src/app/**/${coverageFileGlob}`, `src/state/**/${coverageFileGlob}`, `src/stateWrapper.tsx${coveragePathEnd}`],
      exclude: ['src/intl/**/*'],
      reporter: ['html', 'cobertura', 'lcov'],
    },
    restoreMocks: true,
  },
});
