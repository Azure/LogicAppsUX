import { ExtensionCommand } from '../../../../../libs/vscode-extension/src';

// Mock VS Code API for browser environment
export interface VSCodeApi {
  postMessage(message: any): void;
  getState(): any;
  setState(state: any): void;
}

export const mockVSCodeApi: VSCodeApi = {
  postMessage: (message: any) => {
    console.log('Mock VS Code API - postMessage:', message);
    // In a real scenario, this would communicate with the VS Code extension
    // For now, we'll just log it for debugging

    // We can simulate some responses here for development
    if (message.command === 'initialize_frame') {
      // Mock initialization response
      setTimeout(() => {
        console.log('Mock: Initialized frame');
      }, 100);
    }

    // Mock telemetry logging
    if (message.command === ExtensionCommand.logTelemetry) {
      console.log('Mock Telemetry:', message.key, message.value);
    }
  },

  getState: () => {
    console.log('Mock VS Code API - getState');
    return JSON.parse(sessionStorage.getItem('vscode-state') || '{}');
  },

  setState: (state: any) => {
    console.log('Mock VS Code API - setState:', state);
    sessionStorage.setItem('vscode-state', JSON.stringify(state));
  },
};

// Global mock setup
declare global {
  interface Window {
    acquireVsCodeApi?: () => VSCodeApi;
  }

  // Also declare for globalThis to handle different environments
  // eslint-disable-next-line no-var
  let acquireVsCodeApi: (() => VSCodeApi) | undefined;
}

// Set up the global mock immediately and ensure it's available everywhere
const setupMock = () => {
  const mockFn = () => mockVSCodeApi;

  if (typeof window !== 'undefined') {
    window.acquireVsCodeApi = mockFn;
  }

  if (typeof globalThis !== 'undefined') {
    globalThis.acquireVsCodeApi = mockFn;
  }

  // Also make it available as a global variable
  if (typeof global !== 'undefined') {
    (global as any).acquireVsCodeApi = mockFn;
  }
};

setupMock();
