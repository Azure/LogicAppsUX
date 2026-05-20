import { defineConfig } from '@vscode/test-cli';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig([
  {
    label: 'unitTests',
    files: 'out/test/e2e/**/*.test.js',
    version: 'stable',
    workspaceFolder: path.join(__dirname, 'e2e', 'test-workspace'),
    mocha: {
      ui: 'tdd',
      timeout: 60000,
    },
    launchArgs: [
      '--disable-extensions', // Disable other extensions to speed up tests
      '--user-data-dir', path.join(__dirname, '.vscode-test', 'user-data'),
      '--extensions-dir', path.join(__dirname, '.vscode-test', 'extensions'),
      '--disable-gpu', // Helps with stability in CI
      '--disable-updates', // Prevent update checks
    ],
  },
  {
    label: 'integrationTests',
    files: 'out/test/e2e/integration/**/*.test.js',
    version: 'stable',
    workspaceFolder: path.join(__dirname, 'e2e', 'test-workspace'),
    mocha: {
      ui: 'tdd',
      timeout: 120000,
    },
    launchArgs: [
      '--user-data-dir', path.join(__dirname, '.vscode-test', 'user-data'),
      '--extensions-dir', path.join(__dirname, '.vscode-test', 'extensions'),
      '--disable-gpu',
      '--disable-updates',
    ],
  },
]);
