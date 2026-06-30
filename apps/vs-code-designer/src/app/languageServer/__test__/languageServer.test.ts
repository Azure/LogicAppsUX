import { beforeEach, describe, expect, it, vi } from 'vitest';
import LogicAppsLanguageServer from '../languageServer';
import path from 'path';

const mocks = vi.hoisted(() => ({
  createFileSystemWatcher: vi.fn(),
  getAzureConnectorDetailsForLocalProject: vi.fn(),
  getGlobalSetting: vi.fn(),
  getWorkspaceFolderPath: vi.fn(),
  languageClient: vi.fn(),
  pathExists: vi.fn(),
  readFile: vi.fn(),
  readdir: vi.fn(),
  showWarningMessage: vi.fn(),
  tryGetLogicAppProjectRoot: vi.fn(),
  getDotNetCommand: vi.fn(),
  resolveSdkFromProject: vi.fn(),
}));

vi.mock('vscode', () => ({
  env: {
    sessionId: 'test-session-id',
  },
  MarkdownString: class MarkdownString {
    public supportHtml = false;
    public isTrusted: boolean | { enabledCommands: string[] } = false;
    public supportThemeIcons = false;

    constructor(
      public value: string,
      public supportThemeIconsArg?: boolean
    ) {}
  },
  window: {
    showWarningMessage: mocks.showWarningMessage,
  },
  workspace: {
    createFileSystemWatcher: mocks.createFileSystemWatcher,
    workspaceFolders: [{ uri: { fsPath: 'D:\\workspace' } }],
  },
}));

vi.mock('vscode-languageclient/node', () => ({
  LanguageClient: mocks.languageClient,
}));

vi.mock('../../commands/workflows/switchDebugMode/switchDebugMode', () => ({
  getWorkspaceFolderPath: mocks.getWorkspaceFolderPath,
}));

vi.mock('../../utils/verifyIsProject', () => ({
  tryGetLogicAppProjectRoot: mocks.tryGetLogicAppProjectRoot,
}));

vi.mock('../../utils/dotnet/dotnet', () => ({
  getDotNetCommand: mocks.getDotNetCommand,
}));

vi.mock('../../utils/sdkResolution', () => ({
  resolveSdkFromProject: mocks.resolveSdkFromProject,
}));

vi.mock('fs-extra', () => ({
  pathExists: mocks.pathExists,
  readFile: mocks.readFile,
  readdir: mocks.readdir,
}));

vi.mock('../../utils/vsCodeConfig/settings', () => ({
  getGlobalSetting: mocks.getGlobalSetting,
}));

vi.mock('../../utils/codeless/common', () => ({
  getAzureConnectorDetailsForLocalProject: mocks.getAzureConnectorDetailsForLocalProject,
}));

vi.mock('../../../extensionVariables', () => ({
  ext: {
    context: {
      subscriptions: [],
    },
    languageClient: undefined,
    telemetryString: 'setInGitHubBuild',
  },
}));

describe('LogicAppsLanguageServer', () => {
  const dependenciesPath = 'D:\\dependencies';
  const projectPath = 'D:\\workspace\\logic-app';
  const lspServerPath = path.join(dependenciesPath, 'LSPServer', 'SdkLspServer.dll');

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createFileSystemWatcher.mockReturnValue({ onDidChange: vi.fn() });
    mocks.getGlobalSetting.mockReturnValue(dependenciesPath);
    mocks.getWorkspaceFolderPath.mockResolvedValue('D:\\workspace');
    mocks.languageClient.mockImplementation(() => ({ start: vi.fn().mockResolvedValue(undefined) }));
    mocks.pathExists.mockResolvedValue(false);
    mocks.readFile.mockResolvedValue('{}');
    mocks.readdir.mockResolvedValue([]);
    mocks.tryGetLogicAppProjectRoot.mockResolvedValue(projectPath);
    mocks.getDotNetCommand.mockReturnValue('D:\\dependencies\\DotNetSDK\\dotnet.exe');
    mocks.resolveSdkFromProject.mockResolvedValue(undefined);
    mocks.getAzureConnectorDetailsForLocalProject.mockResolvedValue({
      accessToken: 'Bearer token',
      resourceGroupName: 'resource-group',
      subscriptionId: 'subscription-id',
    });
  });

  it('does not start or read metadata when no Logic App project root is found', async () => {
    mocks.tryGetLogicAppProjectRoot.mockResolvedValue(undefined);

    await new LogicAppsLanguageServer({} as any).start();

    expect(mocks.readdir).not.toHaveBeenCalled();
    expect(mocks.getAzureConnectorDetailsForLocalProject).not.toHaveBeenCalled();
    expect(mocks.languageClient).not.toHaveBeenCalled();
    expect(mocks.showWarningMessage).not.toHaveBeenCalled();
  });

  it('does not start when SDK is not resolved from project or fallback', async () => {
    mocks.pathExists.mockImplementation(async (filePath: string) => filePath === lspServerPath);
    mocks.resolveSdkFromProject.mockResolvedValue(undefined);

    await new LogicAppsLanguageServer({} as any).start();

    expect(mocks.getAzureConnectorDetailsForLocalProject).not.toHaveBeenCalled();
    expect(mocks.languageClient).not.toHaveBeenCalled();
    expect(mocks.showWarningMessage).toHaveBeenCalledWith(
      'Install or repair Logic Apps language server SDK dependencies before starting C# workflow authoring.'
    );
  });

  it('does not join an undefined SDK package path when no SDK package is installed', async () => {
    mocks.pathExists.mockImplementation(async (filePath: string) => filePath === lspServerPath);
    mocks.resolveSdkFromProject.mockResolvedValue(undefined);

    await new LogicAppsLanguageServer({} as any).start();

    expect(mocks.getAzureConnectorDetailsForLocalProject).not.toHaveBeenCalled();
    expect(mocks.languageClient).not.toHaveBeenCalled();
    expect(mocks.showWarningMessage).toHaveBeenCalledWith(
      'Install or repair Logic Apps language server SDK dependencies before starting C# workflow authoring.'
    );
  });

  it('starts the language client when SDK is resolved from the NuGet cache', async () => {
    const resolvedNupkgPath = 'C:\\Users\\user\\.nuget\\packages\\microsoft.azure.workflows.sdk\\1.0.0-preview.2\\microsoft.azure.workflows.sdk.1.0.0-preview.2.nupkg';
    const languageClient = { start: vi.fn().mockResolvedValue(undefined) };
    mocks.languageClient.mockReturnValue(languageClient);
    mocks.pathExists.mockImplementation(async (filePath: string) => filePath === lspServerPath);
    mocks.resolveSdkFromProject.mockResolvedValue({ sdkNupkgPath: resolvedNupkgPath, version: '1.0.0-preview.2' });

    await new LogicAppsLanguageServer({} as any).start();

    expect(mocks.resolveSdkFromProject).toHaveBeenCalledWith(projectPath);
    expect(mocks.getAzureConnectorDetailsForLocalProject).toHaveBeenCalledWith(expect.any(Object), projectPath);
    expect(mocks.languageClient).toHaveBeenCalledWith(
      'logicAppsLanguageServer',
      'Logic Apps language server',
      {
        run: {
          command: 'D:\\dependencies\\DotNetSDK\\dotnet.exe',
          args: [lspServerPath, '--sdk', resolvedNupkgPath],
        },
        debug: {
          command: 'D:\\dependencies\\DotNetSDK\\dotnet.exe',
          args: [lspServerPath, '--sdk', resolvedNupkgPath],
        },
      },
      expect.objectContaining({
        initializationOptions: expect.objectContaining({
          apiConfig: expect.objectContaining({
            bearerToken: 'Bearer token',
            resourceGroup: 'resource-group',
            subscriptionId: 'subscription-id',
          }),
        }),
      })
    );
    expect(languageClient.start).toHaveBeenCalledOnce();
  });

});
