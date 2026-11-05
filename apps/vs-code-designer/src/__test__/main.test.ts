import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { validateAndInstallBinaries } from '../app/commands/binaries/validateAndInstallBinaries';
import { parameterizeAllConnections } from '../app/commands/parameterizeConnections';
import { registerCommands } from '../app/commands/registerCommands';
import { runProjectConsistencyCheck } from '../app/commands/runProjectConsistencyCheck';
import { ensureProjectFiles } from '../app/projectConsistency/projectFilesConsistency';
import { ensureVSCodeFiles } from '../app/projectConsistency/vscodeConsistency';
import * as binaries from '../app/utils/binaries';
import { registerDataMapperV3 } from '../app/utils/dataMapperV3';
import { isDevContainerWorkspace } from '../app/utils/devContainerUtils';
import { enableLocalManagedIdentityAuth } from '../app/utils/managedIdentity';
import { shouldRequireStrictDependencyValidation } from '../app/utils/strictDependencyValidation';
import {
  getWorkspaceSetting,
  isManagedIdentityAuthEnabled,
  shouldParameterizeConnections,
  shouldValidateAndInstallRuntimeDependencies,
  updateGlobalSetting,
} from '../app/utils/vsCodeConfig/settings';
import { autoStartDesignTimeSetting, extensionCommand } from '../constants';
import { ext } from '../extensionVariables';
import { activate, deactivate } from '../main';

const mocks = vi.hoisted(() => ({
  callWithTelemetryAndErrorHandling: vi.fn(),
  codefulProjectsExist: vi.fn(),
  createAzExtOutputChannel: vi.fn(),
  downloadExtensionBundle: vi.fn(),
  getAzureResourcesExtensionApi: vi.fn(),
  getResourceGroupsApi: vi.fn(),
  getWorkspaceLogicAppRoots: vi.fn(),
  isAutoStartDesignTimeNotificationSuppressed: vi.fn(),
  isManagedIdentityAuthNotificationSuppressed: vi.fn(),
  scheduleStartAllDesignTimeApis: vi.fn(),
  startDesignTimeApi: vi.fn(),
  startLanguageServer: vi.fn(),
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

vi.mock('../app/utils/dataMapperV3', () => ({
  registerDataMapperV3: vi.fn(),
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
  startLanguageServer: mocks.startLanguageServer,
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
  codefulProjectsExist: mocks.codefulProjectsExist,
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
  getWorkspaceLogicAppRoots: mocks.getWorkspaceLogicAppRoots,
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
    mocks.getWorkspaceLogicAppRoots.mockResolvedValue([]);
    mocks.isAutoStartDesignTimeNotificationSuppressed.mockReturnValue(false);
    mocks.isManagedIdentityAuthNotificationSuppressed.mockReturnValue(true);
    mocks.codefulProjectsExist.mockResolvedValue(false);
    vi.mocked(shouldRequireStrictDependencyValidation).mockReturnValue(false);
    mocks.startDesignTimeApi.mockResolvedValue(undefined);
    vi.mocked(isDevContainerWorkspace).mockResolvedValue(false);
    vi.mocked(shouldValidateAndInstallRuntimeDependencies).mockReturnValue(false);
    vi.mocked(isManagedIdentityAuthEnabled).mockReturnValue(true);
    vi.mocked(shouldParameterizeConnections).mockReturnValue(false);
    vi.mocked(getWorkspaceSetting).mockReturnValue(false);
    vi.mocked(updateGlobalSetting).mockResolvedValue(undefined);

    ext.designTimeInstances.clear();
  });

  it.each([
    ['blank', [], [], false],
    ['mapper-only', ['D:\\workspace\\DataMaps'], [], false],
    ['mapper-only devcontainer', ['D:\\workspace\\DataMaps'], [], true],
    ['workflow', ['D:\\workspace\\Orders'], ['D:\\workspace\\Orders'], false],
    ['mixed', ['D:\\workspace\\Orders', 'D:\\workspace\\DataMaps'], ['D:\\workspace\\Orders'], false],
  ] as const)('registers the embedded mapper and normal designer in a %s workspace', async (_kind, folders, roots, devContainer) => {
    Object.assign(vscode.workspace, {
      workspaceFolders: folders.map((folder, index) => ({ uri: vscode.Uri.file(folder), name: folder, index })),
    });
    mocks.getWorkspaceLogicAppRoots.mockResolvedValue([...roots]);
    vi.mocked(isDevContainerWorkspace).mockResolvedValue(devContainer);
    vi.mocked(shouldValidateAndInstallRuntimeDependencies).mockReturnValue(true);
    vi.mocked(shouldParameterizeConnections).mockReturnValue(true);
    vi.mocked(isManagedIdentityAuthEnabled).mockReturnValue(false);
    mocks.isManagedIdentityAuthNotificationSuppressed.mockReturnValue(false);
    vi.mocked(getWorkspaceSetting).mockReturnValue(true);
    vi.mocked(vscode.window.showInformationMessage).mockResolvedValue('Enable');
    const context = createExtensionContext();

    await activate(context);
    await flushPromises();
    await Promise.all(backgroundOperations);

    expect(registerDataMapperV3).toHaveBeenCalledExactlyOnceWith(context);
    expect(registerCommands).toHaveBeenCalledOnce();
    expect(vscode.debug.registerDebugConfigurationProvider).toHaveBeenCalledWith('logicapp', expect.anything());
    expect(mocks.getResourceGroupsApi).toHaveBeenCalledOnce();
    expect(vscode.window.registerUriHandler).toHaveBeenCalledOnce();
    if (roots.length === 0) {
      expect(mocks.downloadExtensionBundle).not.toHaveBeenCalled();
      expect(validateAndInstallBinaries).not.toHaveBeenCalled();
      expect(shouldValidateAndInstallRuntimeDependencies).not.toHaveBeenCalled();
      expect(updateGlobalSetting).not.toHaveBeenCalled();
      expect(enableLocalManagedIdentityAuth).not.toHaveBeenCalled();
      expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
      expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
      expect(mocks.startDesignTimeApi).not.toHaveBeenCalled();
      expect(mocks.scheduleStartAllDesignTimeApis).not.toHaveBeenCalled();
      expect(parameterizeAllConnections).not.toHaveBeenCalled();
      expect(ensureProjectFiles).not.toHaveBeenCalled();
      expect(ensureVSCodeFiles).not.toHaveBeenCalled();
      expect(runProjectConsistencyCheck).not.toHaveBeenCalled();
      const events = mocks.callWithTelemetryAndErrorHandling.mock.calls.map(([event]) => event);
      expect(events).not.toContain('activate.enableLocalManagedIdentityAuth');
      expect(events).not.toContain('activate.startDesignTime');
      expect(events).not.toContain('activate.parameterizeAllConnections');
      expect(events).not.toContain('activate.ensureVSCodeFiles');
    } else {
      expect(mocks.downloadExtensionBundle).toHaveBeenCalledOnce();
      expect(validateAndInstallBinaries).toHaveBeenCalledOnce();
      expect(enableLocalManagedIdentityAuth).toHaveBeenCalledOnce();
      expect(parameterizeAllConnections).toHaveBeenCalledOnce();
      expect(ensureProjectFiles).toHaveBeenCalledExactlyOnceWith(expect.anything(), roots[0]);
      expect(ensureVSCodeFiles).toHaveBeenCalledExactlyOnceWith(expect.anything(), [...roots]);
      expect(mocks.startDesignTimeApi).toHaveBeenCalledExactlyOnceWith(expect.anything(), roots[0]);
    }
  });

  it('does not block activation while the auto-start prompt is unanswered', async () => {
    let resolvePrompt!: (value: vscode.MessageItem | undefined) => void;
    const promptPromise = new Promise<vscode.MessageItem | undefined>((resolve) => {
      resolvePrompt = resolve;
    });
    vi.mocked(vscode.window.showWarningMessage).mockReturnValue(promptPromise);
    mocks.getWorkspaceLogicAppRoots.mockResolvedValue(['D:\\workspace\\app-one']);

    await activate(createExtensionContext());
    await flushPromises();

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

  it('keeps commands available while runtime dependencies are still installing', async () => {
    let finishValidation!: () => void;
    vi.mocked(validateAndInstallBinaries).mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finishValidation = resolve;
      })
    );
    vi.mocked(shouldValidateAndInstallRuntimeDependencies).mockReturnValue(true);
    mocks.getWorkspaceLogicAppRoots.mockResolvedValue(['D:\\workspace\\app-one']);
    mocks.codefulProjectsExist.mockResolvedValue(true);
    vi.mocked(getWorkspaceSetting).mockImplementation((key: string) => key === autoStartDesignTimeSetting);
    let activated = false;
    const activation = activate(createExtensionContext()).then(() => {
      activated = true;
    });

    try {
      await flushPromises();
      expect(validateAndInstallBinaries).toHaveBeenCalledOnce();
      expect(activated).toBe(true);
      expect(registerDataMapperV3).toHaveBeenCalledOnce();
      expect(registerCommands).toHaveBeenCalledOnce();
      expect(mocks.getResourceGroupsApi).toHaveBeenCalledOnce();
      expect(vscode.window.registerUriHandler).toHaveBeenCalledOnce();
      expect(mocks.startDesignTimeApi).not.toHaveBeenCalled();
      expect(mocks.startLanguageServer).not.toHaveBeenCalled();
    } finally {
      finishValidation();
      await activation;
      await flushPromises();
      await Promise.all(backgroundOperations);
    }
    expect(mocks.startDesignTimeApi).toHaveBeenCalledOnce();
    expect(mocks.startLanguageServer).toHaveBeenCalledOnce();
  });

  it('does not start deferred runtimes after deactivation', async () => {
    let finishValidation!: () => void;
    vi.mocked(validateAndInstallBinaries).mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finishValidation = resolve;
      })
    );
    vi.mocked(shouldValidateAndInstallRuntimeDependencies).mockReturnValue(true);
    mocks.getWorkspaceLogicAppRoots.mockResolvedValue(['D:\\workspace\\app-one']);
    mocks.codefulProjectsExist.mockResolvedValue(true);
    vi.mocked(getWorkspaceSetting).mockImplementation((key: string) => key === autoStartDesignTimeSetting);

    await activate(createExtensionContext());
    await flushPromises();
    expect(validateAndInstallBinaries).toHaveBeenCalledOnce();
    await deactivate();
    finishValidation();
    await flushPromises();
    await Promise.all(backgroundOperations);

    expect(mocks.startDesignTimeApi).not.toHaveBeenCalled();
    expect(mocks.startLanguageServer).not.toHaveBeenCalled();
  });

  it('still awaits extension-bundle installation in strict validation mode', async () => {
    let finishDownload!: () => void;
    mocks.downloadExtensionBundle.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finishDownload = resolve;
      })
    );
    vi.mocked(shouldRequireStrictDependencyValidation).mockReturnValue(true);
    mocks.getWorkspaceLogicAppRoots.mockResolvedValue(['D:\\workspace\\app-one']);
    let activated = false;
    const activation = activate(createExtensionContext()).then(() => {
      activated = true;
    });

    try {
      await flushPromises();
      expect(mocks.downloadExtensionBundle).toHaveBeenCalledOnce();
      expect(activated).toBe(false);
      expect(mocks.getResourceGroupsApi).not.toHaveBeenCalled();
    } finally {
      finishDownload();
      await activation;
      await flushPromises();
      await Promise.all(backgroundOperations);
    }
    expect(activated).toBe(true);
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
    mocks.getWorkspaceLogicAppRoots.mockResolvedValue(['D:\\workspace\\app-one', 'D:\\workspace\\app-two']);
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
    mocks.getWorkspaceLogicAppRoots.mockResolvedValue(['D:\\workspace\\app-one', 'D:\\workspace\\app-two']);
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
