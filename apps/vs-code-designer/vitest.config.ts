import { defineConfig } from 'vitest/config';
import packageJson from './package.json';
import path from 'path';

export default defineConfig({
  plugins: [],
  resolve: {
    alias: {
      vscode: path.resolve(path.join(__dirname, 'node_modules', '@types', 'vscode', 'index.d.ts')),
    },
  },
  test: {
    name: packageJson.name,
    environment: 'node',
    globals: true,
    restoreMocks: true,
  },
});
