import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { COMMON_ERRORS } from './src/constants';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

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
    callWithTelemetryAndErrorHandling: (_key: string, callback: (context: IActionContext) => any) => {
      // Simply invoke the callback with a fake telemetry context.
      return callback({
        telemetry: { properties: {}, measurements: {} },
        errorHandling: undefined,
        ui: undefined,
        valuesToMask: [],
      });
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
    openUrl: vi.fn(),
  };
});

vi.mock('os', () => ({
  type: vi.fn(() => 'Darwin'),
  release: vi.fn(() => '23.1.0'),
  arch: vi.fn(() => 'x64'),
  homedir: vi.fn(() => '/Users/testuser'),
  tmpdir: vi.fn(() => '/tmp'),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  chmodSync: vi.fn(),
  createWriteStream: vi.fn(),
  readFileSync: vi.fn(() => '{}'),
  writeFileSync: vi.fn(),
  promises: {
    readFile: vi.fn(() => Promise.resolve('{}')),
    writeFile: vi.fn(() => Promise.resolve()),
  },
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
  existsSync: vi.fn(() => {}),
  readdir: vi.fn(),
  stat: vi.fn(),
}));

vi.mock('child_process');

vi.mock('util');

vi.mock('axios');

vi.mock('vscode', () => ({
  window: {
    showInformationMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    createWebviewPanel: vi.fn(() => ({
      webview: { html: '', postMessage: vi.fn(), onDidReceiveMessage: vi.fn() },
      onDidDispose: vi.fn(),
      onDidChangeViewState: vi.fn(),
      iconPath: undefined,
      reveal: vi.fn(),
      active: true,
      dispose: vi.fn(),
    })),
    withProgress: vi.fn((_opts: unknown, cb: () => Promise<unknown>) => cb()),
  },
  workspace: {
    workspaceFolders: [],
    name: 'test-workspace',
    updateWorkspaceFolders: vi.fn(),
    fs: {
      readFile: vi.fn(),
      readDirectory: vi.fn(),
    },
    getConfiguration: vi.fn(),
  },
  Uri: {
    file: (p: string) => ({ fsPath: p, toString: () => p }),
    parse: (s: string) => ({ toString: () => s }),
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
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3,
  },
  ViewColumn: {
    Active: -1,
    Beside: -2,
    One: 1,
    Two: 2,
  },
  ProgressLocation: {
    Notification: 15,
  },
  env: {
    clipboard: {
      writeText: vi.fn(),
    },
    sessionId: 'test-session-id',
    appName: 'Visual Studio Code',
    uriScheme: 'vscode',
    asExternalUri: vi.fn((uri: unknown) => Promise.resolve(uri)),
  },
  version: '1.85.0',
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
    extensionVersion: '1.0.0',
    latestBundleVersion: '1.2.3',
    prefix: 'azureLogicAppsStandard',
    webViewKey: {
      designerLocal: 'designerLocal',
      designerAzure: 'designerAzure',
      monitoring: 'monitoring',
      export: 'export',
      overview: 'overview',
      unitTest: 'unitTest',
      createWorkspace: 'createWorkspace',
      createWorkspaceFromPackage: 'createWorkspaceFromPackage',
      createLogicApp: 'createLogicApp',
      createWorkspaceStructure: 'createWorkspaceStructure',
    },
  },
}));
