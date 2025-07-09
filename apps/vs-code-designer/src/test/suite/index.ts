import * as path from 'path';
import { glob } from 'glob';
import { startVitest } from 'vitest/node';
import * as vscode from 'vscode';
// Fix for URL errors - set NODE_ENV to test
process.env.NODE_ENV = 'test';

process.vscode = vscode;

export async function run(): Promise<void> {
  try {
    const testsRoot = path.resolve(__dirname, '..');

    // Find all test files
    console.log('Directory:', path.dirname);
    const testFiles = await glob('**/**.testE2E.{js,ts}');

    console.log('Found test files:', testFiles);

    if (testFiles.length === 0) {
      console.log('No test files found');
      return;
    }

    globalThis.vscode = vscode; // Ensure vscode is available globally

    // Start Vitest programmatically
    const vitest = await startVitest('test', [], {
      mode: 'test',
      reporters: ['default'],
      include: testFiles,
      // Use the same config as in vitest.config.ts
      environment: 'node',
      globals: true, // Important for accessing vscode through global object
      //exclude: ['**/**.test.{js,ts}'],
      config: '/Users/daniellecogburn/code/LogicAppsUX/apps/vs-code-designer/vitest.config.ts'
    });

    // Wait for tests to complete
    await vitest.start();

    // If there are failures, throw an error
    if (vitest.state.getCountOfFailedTests() > 0) {
      throw new Error(`${vitest.state.getCountOfFailedTests()} tests failed.`);
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
}
