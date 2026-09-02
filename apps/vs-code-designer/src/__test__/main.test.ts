import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import * as binaries from '../app/utils/binaries';
import { isDevContainerWorkspace } from '../app/utils/devContainerUtils';
import { getWorkspaceSetting, shouldValidateAndInstallRuntimeDependencies, updateGlobalSetting } from '../app/utils/vsCodeConfig/settings';
import { autoStartDesignTimeSetting, extensionCommand } from '../constants';
import { ext } from '../extensionVariables';
import { activate } from '../main';

const mocks = vi.hoisted(() => ({
  callWithTelemetryAndErrorHandling: vi.fn(),
  codefulProjectExists: vi.fn(),
  createAzExtOutputChannel: vi.fn(),
  downloadExtensionBundle: vi.fn(),
  getAzureResourcesExtensionApi: vi.fn(),
  getResourceGroupsApi: vi.fn(),
  getLogicAppRoots: vi.fn(),
  isAutoStartDesignTimeNotificationSuppressed: vi.fn(),
  isManagedIdentityAuthNotificationSuppressed: vi.fn(),
  scheduleStartAllDesignTimeApis: vi.fn(),
  startDesignTimeApi: vi.fn(),
}));

vi.mock('@microsoft/vscode-azext-azureappservice', () => ({
  registerAppServiceExtensionVariables: vi.fn(),
}));

vi.mock('@microsoft/vscode-azext-azureutils', () => ({
  registerAzureUtilsExtensionVariables: vi.fn(),
}));

vi.mock('@microsoft/vscode-azext-utils', () => ({
  callWithTelemetryAndErrorHandling: mocks.callWithTelemetryAndErrorHandling,
  createAzExtOutputChannel: mocks.createAzExtOutputChannel,
  DialogResponses: {
    yes: 'Yes',
    no: 'No',
    dontWarnAgain: "Don't warn again",
  },
  registerEvent: vi.fn(),
  registerUIExtensionVariables: vi.fn(),
}));

vi.mock('@microsoft/vscode-azureresources-api', () => ({
  getAzExtResourceType: vi.fn(() => 'logicApp'),
  getAzureResourcesExtensionApi: mocks.getAzureResourcesExtensionApi,
}));

vi.mock('@vscode/extension-telemetry', () => ({
  default: class {
    public dispose = vi.fn();
  },
}));

vi.mock('../app/utils/devContainerUtils', () => ({
  isDevContainerWorkspace: vi.fn(),
}));

vi.mock('../app/utils/vsCodeConfig/settings', () => ({
  getGlobalSetting: vi.fn(),
  getWorkspaceSetting: vi.fn(),
  isManagedIdentityAuthEnabled: vi.fn(() => true),
  shouldParameterizeConnections: vi.fn(() => false),
  updateGlobalSetting: vi.fn(),
  shouldValidateAndInstallRuntimeDependencies: vi.fn(),
}));

vi.mock('../LogicAppResolver', () => ({
  LogicAppResolver: class {},
}));

vi.mock('../app/commands/binaries/validateAndInstallBinaries', () => ({
  validateAndInstallBinaries: vi.fn(),
}));

vi.mock('../app/commands/ensureWorkspace', () => ({
  ensureWorkspace: vi.fn(),
}));

vi.mock('../app/commands/parameterizeConnections', () => ({
  parameterizeAllConnections: vi.fn(),
}));

vi.mock('../app/commands/registerCommands', () => ({
  registerCommands: vi.fn(),
}));

vi.mock('../app/commands/runProjectConsistencyCheck', () => ({
  runProjectConsistencyCheck: vi.fn(),
}));

vi.mock('../app/languageServer/languageServer', () => ({
  startLanguageServer: vi.fn(),
}));

vi.mock('../app/projectConsistency/projectFilesConsistency', () => ({
  ensureProjectFiles: vi.fn(),
}));

vi.mock('../app/projectConsistency/vscodeConsistency', () => ({
  ensureVSCodeFiles: vi.fn(),
}));

vi.mock('../app/resourcesExtension/getExtensionApi', () => ({
  getResourceGroupsApi: mocks.getResourceGroupsApi,
}));

vi.mock('../app/state/notifications', () => ({
  isAutoStartDesignTimeNotificationSuppressed: mocks.isAutoStartDesignTimeNotificationSuppressed,
  isManagedIdentityAuthNotificationSuppressed: mocks.isManagedIdentityAuthNotificationSuppressed,
  isParameterizeConnectionsNotificationSuppressed: vi.fn(() => true),
  suppressAutoStartDesignTimeNotification: vi.fn(),
  suppressManagedIdentityAuthNotification: vi.fn(),
  suppressParameterizeConnectionsNotification: vi.fn(),
}));

vi.mock('../app/utils/bundleFeed', () => ({
  downloadExtensionBundle: mocks.downloadExtensionBundle,
}));

vi.mock('../app/utils/cloudToLocalUtils', () => ({
  runPostExtractStepsFromCache: vi.fn(),
}));

vi.mock('../app/utils/codeless/startDesignTimeApi', () => ({
  scheduleStartAllDesignTimeApis: mocks.scheduleStartAllDesignTimeApis,
  startDesignTimeApi: mocks.startDesignTimeApi,
  stopAllDesignTimeApis: vi.fn(),
}));

vi.mock('../app/utils/codeless/urihandler', () => ({
  UriHandler: class {},
}));

vi.mock('../app/utils/codeful', () => ({
  codefulProjectExists: mocks.codefulProjectExists,
}));

vi.mock('../app/utils/debug', () => ({
  logicAppDebugConfigProvider: {},
}));

vi.mock('../app/utils/extension', () => ({
  getExtensionVersion: vi.fn(() => '1.0.0'),
  initializeCustomExtensionContext: vi.fn(),
  updateLogicAppsContext: vi.fn(),
}));

vi.mock('../app/utils/funcCoreTools/funcHostTask', () => ({
  registerFuncHostTaskEvents: vi.fn(),
}));

vi.mock('../app/utils/managedIdentity', () => ({
  enableLocalManagedIdentityAuth: vi.fn(),
}));

vi.mock('../app/utils/services/VSCodeAzureSubscriptionProvider', () => ({
  createVSCodeAzureSubscriptionProvider: vi.fn(() => ({})),
}));

vi.mock('../app/utils/strictDependencyValidation', () => ({
  shouldRequireStrictDependencyValidation: vi.fn(() => false),
}));

vi.mock('../app/utils/telemetry', () => ({
  logExtensionSettings: vi.fn(),
  logSubscriptions: vi.fn(),
}));

vi.mock('../app/utils/verifyIsProject', () => ({
  tryGetLogicAppProjectRoot: vi.fn(),
}));

vi.mock('../app/utils/workspace', () => ({
  getLogicAppRoots: mocks.getLogicAppRoots,
  selectLogicAppRoot: vi.fn(),
}));

vi.mock('../localize', () => ({
  localize: (_key: string, defaultValue: string) => defaultValue,
}));

const createActionContext = () =>
  ({
    telemetry: { properties: {}, measurements: {} },
    errorHandling: { issueProperties: {} },
    ui: {},
    valuesToMask: [],
  }) as any;

const createExtensionContext = () =>
  ({
    subscriptions: [],
    globalState: {
      get: vi.fn(),
      update: vi.fn(),
    },
  }) as unknown as vscode.ExtensionContext;

const flushPromises = async () => {
  await new Promise<void>((resolve) => setImmediate(resolve));
};

describe('useBinariesDependencies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return false in devContainer workspace', async () => {
    vi.mocked(isDevContainerWorkspace).mockResolvedValue(true);
    vi.mocked(shouldValidateAndInstallRuntimeDependencies).mockReturnValue(true);

    const result = await binaries.useBinariesDependencies();

    expect(result).toBe(false);
  });

  it('should respect autoRuntimeDependenciesValidationAndInstallation setting when not in devContainer', async () => {
    vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
    vi.mocked(shouldValidateAndInstallRuntimeDependencies).mockReturnValue(true);

    const result = await binaries.useBinariesDependencies();

    expect(result).toBe(true);
  });
});

describe('activate design-time startup', () => {
  let backgroundOperations: Promise<unknown>[];

  beforeEach(() => {
    vi.clearAllMocks();
    backgroundOperations = [];

    (vscode as any).debug = {
      registerDebugConfigurationProvider: vi.fn(),
    };
    (vscode.workspace as any).workspaceFolders = [];
    (vscode.workspace as any).onDidChangeWorkspaceFolders = vi.fn();
    (vscode.window as any).registerUriHandler = vi.fn();

    mocks.callWithTelemetryAndErrorHandling.mockImplementation(
      (eventName: string, callback: (context: ReturnType<typeof createActionContext>) => Promise<unknown>) => {
        const operation = Promise.resolve(callback(createActionContext()));
        if (eventName === extensionCommand.activate) {
          return operation;
        }

        const guardedOperation = operation.catch(() => undefined);
        backgroundOperations.push(guardedOperation);
        return guardedOperation;
      }
    );

    mocks.createAzExtOutputChannel.mockReturnValue({
      appendLog: vi.fn(),
      dispose: vi.fn(),
    });
    mocks.downloadExtensionBundle.mockResolvedValue(undefined);
    mocks.getAzureResourcesExtensionApi.mockResolvedValue({});
    mocks.getResourceGroupsApi.mockResolvedValue({
      appResourceTree: {
        _rootTreeItem: {},
      },
      registerApplicationResourceResolver: vi.fn(),
    });
    mocks.getLogicAppRoots.mockResolvedValue([]);
    mocks.isAutoStartDesignTimeNotificationSuppressed.mockReturnValue(false);
    mocks.isManagedIdentityAuthNotificationSuppressed.mockReturnValue(true);
    mocks.codefulProjectExists.mockResolvedValue(false);
    mocks.startDesignTimeApi.mockResolvedValue(undefined);
    vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
    vi.mocked(shouldValidateAndInstallRuntimeDependencies).mockReturnValue(false);
    vi.mocked(getWorkspaceSetting).mockReturnValue(false);
    vi.mocked(updateGlobalSetting).mockResolvedValue(undefined);

    ext.designTimeInstances.clear();
  });

  it('does not block activation while the auto-start prompt is unanswered', async () => {
    let resolvePrompt!: (value: vscode.MessageItem | undefined) => void;
    const promptPromise = new Promise<vscode.MessageItem | undefined>((resolve) => {
      resolvePrompt = resolve;
    });
    vi.mocked(vscode.window.showWarningMessage).mockReturnValue(promptPromise);
    mocks.getLogicAppRoots.mockResolvedValue(['D:\\workspace\\app-one']);

    await activate(createExtensionContext());

    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
      'Always start the background design-time process at launch? The workflow designer will open faster.',
      { title: 'Yes (Recommended)' },
      { title: "Don't warn again" }
    );
    expect(mocks.getResourceGroupsApi).toHaveBeenCalled();
    expect(mocks.startDesignTimeApi).not.toHaveBeenCalled();

    resolvePrompt(undefined);
    await flushPromises();
    await Promise.all(backgroundOperations);
  });

  it('starts all workspace projects before waiting for any startup to finish', async () => {
    let resolveFirstStartup!: () => void;
    let resolveSecondStartup!: () => void;
    const firstStartup = new Promise<void>((resolve) => {
      resolveFirstStartup = resolve;
    });
    const secondStartup = new Promise<void>((resolve) => {
      resolveSecondStartup = resolve;
    });
    mocks.getLogicAppRoots.mockResolvedValue(['D:\\workspace\\app-one', 'D:\\workspace\\app-two']);
    vi.mocked(getWorkspaceSetting).mockImplementation((key: string) => key === autoStartDesignTimeSetting);
    mocks.startDesignTimeApi.mockImplementation((_context, projectPath: string) => {
      return projectPath.endsWith('app-one') ? firstStartup : secondStartup;
    });

    await activate(createExtensionContext());
    await flushPromises();

    expect(mocks.startDesignTimeApi).toHaveBeenCalledTimes(2);
    expect(mocks.startDesignTimeApi).toHaveBeenCalledWith(expect.any(Object), 'D:\\workspace\\app-one');
    expect(mocks.startDesignTimeApi).toHaveBeenCalledWith(expect.any(Object), 'D:\\workspace\\app-two');

    resolveFirstStartup();
    resolveSecondStartup();
    await Promise.all(backgroundOperations);
  });

  it('attempts every project and keeps activation successful when one startup fails', async () => {
    mocks.getLogicAppRoots.mockResolvedValue(['D:\\workspace\\app-one', 'D:\\workspace\\app-two']);
    vi.mocked(getWorkspaceSetting).mockImplementation((key: string) => key === autoStartDesignTimeSetting);
    mocks.startDesignTimeApi.mockImplementation((_context, projectPath: string) => {
      return projectPath.endsWith('app-one') ? Promise.reject(new Error('startup failed')) : Promise.resolve();
    });

    await expect(activate(createExtensionContext())).resolves.toBeUndefined();
    await flushPromises();
    await Promise.all(backgroundOperations);

    expect(mocks.startDesignTimeApi).toHaveBeenCalledTimes(2);
    expect(mocks.startDesignTimeApi).toHaveBeenCalledWith(expect.any(Object), 'D:\\workspace\\app-one');
    expect(mocks.startDesignTimeApi).toHaveBeenCalledWith(expect.any(Object), 'D:\\workspace\\app-two');
  });
});
