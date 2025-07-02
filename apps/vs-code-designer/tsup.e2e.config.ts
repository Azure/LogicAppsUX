import { defineConfig } from 'tsup';
import type { Options } from 'tsup';

const e2eConfig: Options = {
  entry: ['src/test/**/*.ts'],
  splitting: false,
  sourcemap: true,
  clean: false,
  external: ['vscode', 'monocart-coverage-reports', '@aws-sdk/client-s3', '@vitest/browser', 'lightningcss'],
  keepNames: true,
  outDir: 'dist/e2e',
};

export default defineConfig(e2eConfig);
