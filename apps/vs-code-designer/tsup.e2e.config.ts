import { defineConfig } from 'tsup';
import type { Options } from 'tsup';

const e2eConfig: Options = {
  entry: ['src/test/**/*.ts'],
  splitting: false,
  sourcemap: true,
  clean: false,
  external: [
    // VS Code related
    'vscode',
    // Core Node modules
    'path',
    'fs',
    'url',
    'util',
    'os',
    'assert',
    'process',
    'module',
    // Test related
    'vitest',
    'vitest/node',
    'vite',
    'glob',
    'monocart-coverage-reports',
    '@aws-sdk/client-s3',
    '@vitest/browser',
    'lightningcss',
  ],
  // Critical: For VS Code extensions, use CommonJS format
  format: ['cjs'],
  platform: 'node',
  target: 'node16',
  keepNames: true,
  outDir: 'dist/e2e',
  // Define environment variables that Vite needs
  define: {
    'process.env.NODE_ENV': JSON.stringify('test'),
    'import.meta.url': 'undefined',
  },
  // Ensure node: protocol URLs work
  noExternal: [],
};

export default defineConfig(e2eConfig);
