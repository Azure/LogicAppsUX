import path from 'node:path';
import { defineProject } from 'vitest/config';
import packageJson from './package.json';

export default defineProject({
  test: {
    name: packageJson.name,
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
  resolve: {
    alias: { vscode: path.resolve(__dirname, 'test/__mocks__/vscode.ts') },
  },
});
