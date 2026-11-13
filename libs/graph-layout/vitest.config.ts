import { defineProject } from 'vitest/config';
import packageJson from './package.json';

export default defineProject({
  test: {
    name: packageJson.name,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'bench/**/*.spec.ts'],
    benchmark: { include: ['bench/**/*.bench.ts'] },
    coverage: { enabled: true, provider: 'istanbul', include: ['src/**/*'], reporter: ['html', 'cobertura', 'lcov'] },
  },
});
