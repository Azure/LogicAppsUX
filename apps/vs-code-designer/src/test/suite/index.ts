import * as path from 'path';
import { glob } from 'glob';
import { startVitest } from 'vitest/node';
import * as vscode from 'vscode';
import * as fs from 'fs';
// Fix for URL errors - set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Assign vscode to both process.vscode and globalThis.vscode
process.vscode = vscode;
globalThis.vscode = vscode;

// Log info for debugging
console.log('index.ts: VS Code API assigned to process.vscode and globalThis.vscode');
console.log('index.ts: VS Code API available:', !!process.vscode);
console.log('index.ts: VS Code extensions available:', !!process.vscode?.extensions);

export async function run(): Promise<void> {
  try {

    // Find all test files
    console.log('Directory:', path.dirname);
    const testFiles = await glob('**/**.testE2E.{js,ts}');

    console.log('Found test files:', testFiles);

    if (testFiles.length === 0) {
      console.log('No test files found');
      return;
    }

    // Create a direct global hook to ensure VS Code API is available
    // This ensures the VS Code API is available in tests run by Vitest
    const testsRoot = path.resolve(__dirname, '..');
    const manualHookPath = path.join(testsRoot, 'vscode-hook.js');
    
    // Write a module that sets the global.vscode for tests
    fs.writeFileSync(
      manualHookPath,
      `
// This file is auto-generated to provide the VS Code API to tests
globalThis.vscode = process.vscode;
console.log('vscode-hook.js: Setting globalThis.vscode from process.vscode');
console.log('vscode-hook.js: globalThis.vscode available:', !!globalThis.vscode);
`,
      'utf8'
    );
    
    // Make sure the hook is immediately executed
    try {
      require(manualHookPath);
      console.log('Manual VS Code API hook loaded successfully');
    } catch (error) {
      console.error('Failed to load manual VS Code API hook:', error);
    }

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
