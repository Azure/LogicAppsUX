import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';

// Hoisted mocks
const {
  mockIsLogicApp,
  mockHasCodefulSdkReference,
  mockTryGetLogicAppCustomCodeFunctionsProjects,
  mockCreateWorkspaceWebviewCommandHandler,
  mockShowErrorMessage,
  mockCallWithTelemetryAndErrorHandling,
} = vi.hoisted(() => ({
  mockIsLogicApp: vi.fn(),
  mockHasCodefulSdkReference: vi.fn(),
  mockTryGetLogicAppCustomCodeFunctionsProjects: vi.fn(),
  mockCreateWorkspaceWebviewCommandHandler: vi.fn(),
  mockShowErrorMessage: vi.fn(),
  mockCallWithTelemetryAndErrorHandling: vi.fn(async (_id: string, cb: any) =>
    cb({
      telemetry: { properties: {} },
      errorHandling: {},
    })
  ),
}));

vi.mock('vscode', () => ({
  window: {
    showErrorMessage: mockShowErrorMessage,
  },
  workspace: {
    workspaceFile: undefined as vscode.Uri | undefined,
    fs: {
      readFile: vi.fn(),
      readDirectory: vi.fn().mockResolvedValue([]),
    },
  },
  Uri: {
    file: (p: string) => ({ fsPath: p, path: p, scheme: 'file' }),
  },
  FileType: { Directory: 2 },
}));

vi.mock('../../../utils/workspace', () => ({
  isLogicApp: mockIsLogicApp,
}));

vi.mock('../../../utils/codeful', () => ({
  hasCodefulSdkReference: mockHasCodefulSdkReference,
}));

vi.mock('../../../utils/customCodeUtils', () => ({
  tryGetLogicAppCustomCodeFunctionsProjects: mockTryGetLogicAppCustomCodeFunctionsProjects,
}));

vi.mock('../../shared/workspaceWebviewCommandHandler', () => ({
  createWorkspaceWebviewCommandHandler: mockCreateWorkspaceWebviewCommandHandler,
}));

vi.mock('../../createNewCodeProject/CodeProjectBase/CreateLogicAppProjects', () => ({
  createLogicAppProject: vi.fn(),
}));

vi.mock('../../../../localize', () => ({
  localize: (_key: string, msg: string, ...args: any[]) => {
    let result = msg;
    args.forEach((a, i) => {
      result = result.replace(`{${i}}`, String(a));
    });
    return result;
  },
}));

vi.mock('../../../../extensionVariables', () => ({
  ext: {
    outputChannel: { appendLog: vi.fn() },
    webViewKey: { createLogicApp: 'createLogicApp' },
    extensionVersion: '1.0.0',
    context: { extensionPath: '/mock' },
  },
}));

vi.mock('../../../../constants', () => ({
  extensionContext: {
    customCodeFunctionsFolders: 'azureLogicAppsStandard.customCode.functionsFolders',
    customCodeEligibleLogicAppFolders: 'azureLogicAppsStandard.customCode.eligibleLogicAppFolders',
  },
}));

vi.mock('@microsoft/vscode-azext-utils', () => ({
  callWithTelemetryAndErrorHandling: mockCallWithTelemetryAndErrorHandling,
  AzureWizardPromptStep: vi.fn(),
  AzureWizardExecuteStep: vi.fn(),
  AzureWizard: class {
    async prompt() {}
    async execute() {}
  },
  registerCommand: vi.fn(),
  registerCommandWithTreeNodeUnwrapping: vi.fn(),
  registerErrorHandler: vi.fn(),
  registerReportIssueCommand: vi.fn(),
  unwrapTreeNodeCommandCallback: vi.fn(),
  parseError: vi.fn(() => ({ message: 'mock error' })),
  UserCancelledError: class extends Error {},
  nonNullProp: vi.fn(),
  nonNullValue: vi.fn(),
  nonNullOrEmptyValue: vi.fn((v: any) => v),
  DialogResponses: vi.fn(),
  AzExtTreeItem: class {},
  AzExtParentTreeItem: class {},
  openUrl: vi.fn(),
}));

import { addCustomCode } from '../addCustomCode';

describe('addCustomCode', () => {
  const createContext = (): IActionContext =>
    ({
      telemetry: { properties: {}, measurements: {} },
      errorHandling: {},
      ui: {},
      valuesToMask: [],
    }) as unknown as IActionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLogicApp.mockResolvedValue(false);
    mockHasCodefulSdkReference.mockResolvedValue(false);
    mockTryGetLogicAppCustomCodeFunctionsProjects.mockResolvedValue(undefined);
  });

  it('should show error when no URI is provided', async () => {
    await addCustomCode(createContext(), undefined);
    expect(mockShowErrorMessage).toHaveBeenCalledWith(expect.stringContaining('Explorer context menu'));
    expect(mockCreateWorkspaceWebviewCommandHandler).not.toHaveBeenCalled();
  });

  it('should show error when folder is not a Logic App project', async () => {
    mockIsLogicApp.mockResolvedValue(false);
    const uri = vscode.Uri.file('/workspace/notALogicApp');
    await addCustomCode(createContext(), uri);
    expect(mockShowErrorMessage).toHaveBeenCalledWith(expect.stringContaining('not a Logic App project'));
    expect(mockCreateWorkspaceWebviewCommandHandler).not.toHaveBeenCalled();
  });

  it('should show error when folder is a codeful project', async () => {
    mockIsLogicApp.mockResolvedValue(true);
    mockHasCodefulSdkReference.mockResolvedValue(true);
    const uri = vscode.Uri.file('/workspace/codefulApp');
    await addCustomCode(createContext(), uri);
    expect(mockShowErrorMessage).toHaveBeenCalledWith(expect.stringContaining('.NET SDK project'));
    expect(mockCreateWorkspaceWebviewCommandHandler).not.toHaveBeenCalled();
  });

  it('should show error when custom code already exists', async () => {
    mockIsLogicApp.mockResolvedValue(true);
    mockHasCodefulSdkReference.mockResolvedValue(false);
    mockTryGetLogicAppCustomCodeFunctionsProjects.mockResolvedValue(['/workspace/MyFunctions']);
    const uri = vscode.Uri.file('/workspace/myLogicApp');
    await addCustomCode(createContext(), uri);
    expect(mockShowErrorMessage).toHaveBeenCalledWith(expect.stringContaining('already has an associated custom code project'));
    expect(mockCreateWorkspaceWebviewCommandHandler).not.toHaveBeenCalled();
  });

  it('should show error when no workspace file is open', async () => {
    mockIsLogicApp.mockResolvedValue(true);
    mockHasCodefulSdkReference.mockResolvedValue(false);
    mockTryGetLogicAppCustomCodeFunctionsProjects.mockResolvedValue([]);
    (vscode.workspace as any).workspaceFile = undefined;
    const uri = vscode.Uri.file('/workspace/myLogicApp');
    await addCustomCode(createContext(), uri);
    expect(mockShowErrorMessage).toHaveBeenCalledWith(expect.stringContaining('.code-workspace'));
    expect(mockCreateWorkspaceWebviewCommandHandler).not.toHaveBeenCalled();
  });

  it('should open wizard with pre-configured custom code data when all validations pass', async () => {
    mockIsLogicApp.mockResolvedValue(true);
    mockHasCodefulSdkReference.mockResolvedValue(false);
    mockTryGetLogicAppCustomCodeFunctionsProjects.mockResolvedValue([]);
    const workspaceUri = vscode.Uri.file('/workspace/myWorkspace.code-workspace');
    (vscode.workspace as any).workspaceFile = workspaceUri;
    (vscode.workspace.fs.readFile as any).mockResolvedValue(Buffer.from(JSON.stringify({ folders: [{ path: 'myLogicApp' }] })));
    (vscode.workspace.fs.readDirectory as any).mockResolvedValue([['myLogicApp', vscode.FileType.Directory]]);

    const uri = vscode.Uri.file('/workspace/myLogicApp');
    await addCustomCode(createContext(), uri);

    expect(mockCreateWorkspaceWebviewCommandHandler).toHaveBeenCalledTimes(1);
    const config = mockCreateWorkspaceWebviewCommandHandler.mock.calls[0][0];
    expect(config.extraInitializeData.isAddCustomCodeFlow).toBe(true);
    expect(config.extraInitializeData.preselectedLogicAppName).toBe('myLogicApp');
    expect(config.extraInitializeData.preselectedLogicAppType).toBe('customCode');
    expect(config.extraInitializeData.logicAppsWithoutCustomCode).toEqual([expect.objectContaining({ label: 'myLogicApp' })]);
  });
});
