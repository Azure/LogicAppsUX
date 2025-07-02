import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/test/**/*.ts'],
    splitting: false,
    sourcemap: true,
    clean: false,
    external: ['vscode','monocart-coverage-reports', '@aws-sdk/client-s3', '@vitest/browser', 'lightningcss'],
    keepNames: true,
    outDir: 'dist/e2e',
  }
]);