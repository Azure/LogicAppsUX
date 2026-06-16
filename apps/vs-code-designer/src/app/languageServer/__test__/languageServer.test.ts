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
  const sdkFolderPath = path.join(dependenciesPath, 'LanguageServerLogicApps');
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

  it('does not scan a missing SDK directory', async () => {
    mocks.pathExists.mockImplementation(async (filePath: string) => filePath === lspServerPath);

    await new LogicAppsLanguageServer({} as any).start();

    expect(mocks.pathExists).toHaveBeenCalledWith(sdkFolderPath);
    expect(mocks.readdir).not.toHaveBeenCalled();
    expect(mocks.getAzureConnectorDetailsForLocalProject).not.toHaveBeenCalled();
    expect(mocks.languageClient).not.toHaveBeenCalled();
    expect(mocks.showWarningMessage).toHaveBeenCalledWith(
      'Install or repair Logic Apps language server SDK dependencies before starting C# workflow authoring.'
    );
  });

  it('does not join an undefined SDK package path when no SDK package is installed', async () => {
    mocks.pathExists.mockImplementation(async (filePath: string) => filePath === lspServerPath || filePath === sdkFolderPath);
    mocks.readdir.mockResolvedValue(['readme.txt']);

    await new LogicAppsLanguageServer({} as any).start();

    expect(mocks.readdir).toHaveBeenCalledWith(sdkFolderPath);
    expect(mocks.getAzureConnectorDetailsForLocalProject).not.toHaveBeenCalled();
    expect(mocks.languageClient).not.toHaveBeenCalled();
    expect(mocks.showWarningMessage).toHaveBeenCalledWith(
      'Install or repair Logic Apps language server SDK dependencies before starting C# workflow authoring.'
    );
  });

  it('starts the language client when project and language server dependencies are available', async () => {
    const languageClient = { start: vi.fn().mockResolvedValue(undefined) };
    mocks.languageClient.mockReturnValue(languageClient);
    mocks.pathExists.mockImplementation(async (filePath: string) => filePath === lspServerPath || filePath === sdkFolderPath);
    mocks.readdir.mockResolvedValue(['Microsoft.Azure.Workflows.Sdk.1.0.0-preview.1.nupkg']);

    await new LogicAppsLanguageServer({} as any).start();

    expect(mocks.getAzureConnectorDetailsForLocalProject).toHaveBeenCalledWith(expect.any(Object), projectPath);
    expect(mocks.languageClient).toHaveBeenCalledWith(
      'logicAppsLanguageServer',
      'Logic Apps language server',
      {
        run: {
          command: 'D:\\dependencies\\DotNetSDK\\dotnet.exe',
          args: [lspServerPath, '--sdk', path.join(sdkFolderPath, 'Microsoft.Azure.Workflows.Sdk.1.0.0-preview.1.nupkg')],
        },
        debug: {
          command: 'D:\\dependencies\\DotNetSDK\\dotnet.exe',
          args: [lspServerPath, '--sdk', path.join(sdkFolderPath, 'Microsoft.Azure.Workflows.Sdk.1.0.0-preview.1.nupkg')],
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
