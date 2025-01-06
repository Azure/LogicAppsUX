import { defineProject } from 'vitest/config';
import packageJson from './package.json';

export default defineProject({
  plugins: [],
  resolve: {},
  test: {
    name: packageJson.name,
    environment: 'node',
    setupFiles: ['test-setup.ts'],
    coverage: { enabled: true, provider: 'istanbul', include: ['src/**/*'], reporter: ['html', 'cobertura'] },
    restoreMocks: true,
  },
});
