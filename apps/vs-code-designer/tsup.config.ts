import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [ 'src/e2e/*.ts'], // Include the specific file and folder
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['vscode', 'monocart-coverage-reports', '@aws-sdk/client-s3'],
  keepNames: true,
  outDir: 'dist/e2e',
});