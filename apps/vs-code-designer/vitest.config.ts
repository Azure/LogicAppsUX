import { defineProject } from 'vitest/config';
import packageJson from './package.json';
import path from 'path';

export default defineProject({
  plugins: [],
  resolve: {
    alias: {
      vscode: path.resolve(path.join(__dirname, 'node_modules', '@types', 'vscode', 'index.d.ts')),
    },
  },
  test: {
    name: packageJson.name,
    environment: 'node',
    setupFiles: ['/Users/daniellecogburn/code/LogicAppsUX/apps/vs-code-designer/dist/e2e/vscode-environment.js'], // Use our custom environment setup
    globals: true, // Important for accessing global.vscode
    restoreMocks: true,
  },
});
