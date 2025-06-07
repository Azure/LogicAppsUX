import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { COMMON_ERRORS } from './src/constants';

// https://testing-library.com/docs/react-testing-library/api#cleanup
afterEach(() => cleanup());

vi.mock('@microsoft/vscode-azext-azureutils', () => ({
  // mock implementation or empty object
}));

vi.mock('@microsoft/vscode-azext-azureauth', () => ({
  getSessionFromVSCode: vi.fn(() => Promise.resolve({})), // example of a mocked function
  VSCodeAzureSubscriptionProvider: class VSCodeAzureSubscriptionProvider {},
}));

vi.mock('@microsoft/vscode-azext-utils', () => {
  return {
    AzureWizardExecuteStep: vi.fn().mockImplementation(() => {
      return {};
    }),
    AzureWizardPromptStep: vi.fn().mockImplementation(() => {
      return {};
    }),
    AzureWizard: class {
      async prompt() {}
      async execute() {}
    },
    nonNullProp: vi.fn(),
    nonNullValue: vi.fn(),
    callWithTelemetryAndErrorHandling: (_key: string, callback: Function) => {
      // Simply invoke the callback with a fake telemetry context.
      return callback({ telemetry: { properties: {} } });
    },
    parseError: vi.fn(() => {
      return { message: 'error' };
    }),
    UserCancelledError: class UserCancelledError extends Error {
      constructor() {
        super(COMMON_ERRORS.OPERATION_CANCELLED);
      }
    },
    DialogResponses: vi.fn(),
    AzExtTreeItem: class AzExtTreeItem {},
    AzExtParentTreeItem: class AzExtParentTreeItem {},
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
  existsSync: vi.fn(() => {}),
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
    fs: {
      readFile: vi.fn(),
      readDirectory: vi.fn(),
    },
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
  FileType: {
    File: 'file',
    Directory: 'directory',
  },
}));

vi.mock('./src/extensionVariables', () => ({
  ext: {
    outputChannel: {
      show: vi.fn(),
      appendLog: vi.fn(),
    },
    designTimeInstances: new Map(),
    pinnedBundleVersion: new Map(),
    currentBundleVersion: new Map(),
  },
}));
