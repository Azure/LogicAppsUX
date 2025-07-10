import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { logicAppsStandardExtensionId } from '../../constants';

// Get the vscode API from the global that was set by our environment setup
// Our vscode-environment.ts sets this up
declare const vscode: any; // This will be provided by our custom environment

describe('Extension Test Suite', () => {
  beforeAll(() => {
    // Try multiple ways to get the VS Code API
    console.log('Direct vscode variable available:', typeof vscode !== 'undefined');
    console.log('globalThis.vscode available:', typeof globalThis.vscode !== 'undefined');
    console.log('process.vscode available:', typeof process.vscode !== 'undefined');
    
    // If vscode is not defined directly, try to get it from globalThis or process
    const vsCodeAPI = vscode || globalThis.vscode || process.vscode;
    
    if (vsCodeAPI) {
      console.log('VS Code API found. Version:', vsCodeAPI.version);
      console.log('VS Code extensions API available:', typeof vsCodeAPI.extensions !== 'undefined');
      
      // Assign it to global if not already there
      if (!globalThis.vscode && vsCodeAPI) {
        globalThis.vscode = vsCodeAPI;
        console.log('Set globalThis.vscode from available source');
      }
    } else {
      console.error('VS Code API is unavailable in all locations! Tests requiring VS Code API will fail.');
      console.log('Environment variables:', process.env.NODE_ENV, process.env.VSCODE_API_TESTS);
    }
  });

  afterAll(() => {
    console.log('All tests done!');
  });

  it('Sample test', () => {
    expect([1, 2, 3].indexOf(5)).toBe(-1);
    expect([1, 2, 3].indexOf(1)).toBe(0);
  });

  it('VS Code API should be available', () => {
    // This test verifies that the VS Code API is available
    expect(vscode).toBeDefined();
    expect(typeof vscode.window).toBe('object');
    expect(typeof vscode.workspace).toBe('object');
  });

  it('Extension is loaded', () => {
    // Check if our extension is loaded
    console.log('vscode.extensions available:', vscode.extensions !== undefined);
    
    if (vscode.extensions) {
      console.log('Extensions count:', vscode.extensions.all.length);
      console.log('Looking for extension ID:', logicAppsStandardExtensionId);
      
      const extension = vscode.extensions.getExtension(logicAppsStandardExtensionId);
      expect(extension).toBeTruthy();
    }
  });
});
