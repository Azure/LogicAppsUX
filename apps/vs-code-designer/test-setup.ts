import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// https://testing-library.com/docs/react-testing-library/api#cleanup
afterEach(() => cleanup());

vi.mock('@microsoft/vscode-azext-azureutils', () => ({
  // mock implementation or empty object
}));

vi.mock('@microsoft/vscode-azext-azureauth', () => ({
  getSessionFromVSCode: vi.fn(() => Promise.resolve({})), // example of a mocked function
}));

vi.mock('@microsoft/vscode-azext-utils', () => {
  return {
    AzureWizardExecuteStep: vi.fn().mockImplementation(() => {
      return {};
    }),
    AzureWizardPromptStep: vi.fn().mockImplementation(() => {
      return {};
    }),
    nonNullProp: vi.fn(),
    nonNullValue: vi.fn(),
    callWithTelemetryAndErrorHandling: (_key: string, callback: Function) => {
      // Simply invoke the callback with a fake telemetry context.
      return callback({ telemetry: { properties: {} } });
    },
    parseError: vi.fn(() => {
      return { message: 'error' };
    }),
  };
});

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  chmodSync: vi.fn(),
  createWriteStream: vi.fn(),
  dirent: vi.fn().mockImplementation(() => ({
    isDirectory: vi.fn().mockImplementation(() => {
      return true;
    }),
  })),
}));

vi.mock('fs-extra', () => ({
  writeFile: vi.fn(() => Promise.resolve()),
  ensureDir: vi.fn(() => Promise.resolve()),
  readFile: vi.fn(() => Promise.resolve()),
  pathExists: vi.fn(() => Promise.resolve()),
  readdir: vi.fn(() => Promise.resolve()),
}));

vi.mock('child_process');

vi.mock('util');

vi.mock('axios');

vi.mock('vscode', () => ({
  window: {
    showInformationMessage: vi.fn(),
    showErrorMessage: vi.fn(),
  },
  workspace: {
    workspaceFolders: [],
    updateWorkspaceFolders: vi.fn(), // <-- This ensures the method exists.
  },
  Uri: {
    file: (p: string) => ({ fsPath: p, toString: () => p }),
  },
  commands: {
    executeCommand: vi.fn(),
  },
  EventEmitter: vi.fn().mockImplementation(() => ({
    getUser: vi.fn(),
  })),
}));
