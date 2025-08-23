import { defineConfig } from 'tsup';
import type { Options } from 'tsup';

const uiTestConfig: Options = {
  entry: ['src/test/ui/**/*.ts'],
  format: ['cjs'], // CommonJS for Mocha compatibility
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
    'chai',
    'mocha',
    'vscode-extension-tester',
  ],
  keepNames: true,
  outDir: 'out/test',
  target: 'node16',
};

export default defineConfig(uiTestConfig);
