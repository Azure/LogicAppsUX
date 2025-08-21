/**
 * Custom Vitest environment for VS Code extension tests
 * Based on: https://github.com/microsoft/vscode-test/issues/37#issuecomment-700167820
 */

import path from 'path';
import fs from 'fs';
import { beforeAll } from 'vitest';

// Detect where the VS Code API is available
const getVSCodeAPI = () => {
  // Try different places where the VS Code API might be available
  const api = globalThis.vscode || process.vscode;
  return api;
};

// Create a custom setup function that will be called by Vitest
export function setup() {
  console.log('vscode-environment.ts: Setting up VS Code extension test environment');

  try {
    // Get the VS Code API from the best available source
    const vscodeApi = getVSCodeAPI();

    if (vscodeApi) {
      console.log('vscode-environment.ts: VS Code API found and available');

      // Make it globally available
      globalThis.vscode = vscodeApi;

      // Create a module that can be imported in tests
      const vscodePath = path.join(process.cwd(), 'dist/e2e/test/vscode-api.js');

      // Create the directory if it doesn't exist
      const dirPath = path.dirname(vscodePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      // Create a module that exports the VS Code API
      fs.writeFileSync(
        vscodePath,
        `
// This file is auto-generated to provide access to the VS Code API
// It makes the VS Code API available for importing in tests

// Export for CommonJS
module.exports = globalThis.vscode || process.vscode;

// Export for ESM
export default globalThis.vscode || process.vscode;
        `,
        'utf8'
      );

      console.log('vscode-environment.ts: Created VS Code API module at:', vscodePath);

      // Create a hook to run before all tests
      beforeAll(() => {
        console.log('vscode-environment.ts: beforeAll hook running');
        console.log('vscode-environment.ts: globalThis.vscode available:', !!globalThis.vscode);

        // Set it again just to be sure
        if (!globalThis.vscode && vscodeApi) {
          globalThis.vscode = vscodeApi;
          console.log('vscode-environment.ts: Reset globalThis.vscode in beforeAll hook');
        }
      });
    } else {
      console.warn('vscode-environment.ts: VS Code API is not available. Tests requiring VS Code API will fail.');

      // Try to import vscode directly as a last resort
      try {
        const vscode = require('vscode');
        if (vscode) {
          console.log('vscode-environment.ts: Successfully imported vscode module directly');
          globalThis.vscode = vscode;
        }
      } catch (err) {
        console.log('vscode-environment.ts: Could not import vscode module:', err.message);
      }
    }
  } catch (error) {
    console.error('vscode-environment.ts: Error setting up VS Code environment:', error);
  }

  // Return an object that will be merged with the Vitest global context
  return {
    vscode: globalThis.vscode || process.vscode,
  };
}

// Clean up function
export function teardown() {
  console.log('vscode-environment.ts: Tearing down VS Code extension test environment');
  // Any additional cleanup can go here
}
