import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import * as binaries from '../app/utils/binaries';
import { isDevContainerWorkspace } from '../app/utils/devContainerUtils';
import { getWorkspaceSetting, shouldValidateAndInstallRuntimeDependencies, updateGlobalSetting } from '../app/utils/vsCodeConfig/settings';
import { autoStartDesignTimeSetting, extensionCommand } from '../constants';
import { ext } from '../extensionVariables';
import { activate } from '../main';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { validateAndInstallBinaries } from '../app/commands/binaries/validateAndInstallBinaries';
import { getGlobalSetting } from '../app/utils/vsCodeConfig/settings';
import {
  bootstrapRequest,
  snapshotBootstrapBinary,
  writeBootstrapAttestation,
  readBootstrapAttestation,
} from '../test/e2e/workspaceMultiRootBootstrap';
import { multiRootRegularLaunch, observeFuncRuntime, assertFuncRuntimeResolution } from '../test/e2e/workspaceMultiRootLaunch';

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
  registerEvent: vi.fn(),
  runProjectConsistencyCheck: vi.fn(),
  scheduleStartAllDesignTimeApis: vi.fn(),
  startDesignTimeApi: vi.fn(),
}));

// This control needs real IO only for its unit-owned binary fixture; all
// activation side effects (Code/runtime/download/services) remain mocked below.
vi.unmock('fs');
vi.unmock('node:fs');
vi.unmock('os');
vi.unmock('node:os');

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
  registerEvent: mocks.registerEvent,
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
  runProjectConsistencyCheck: mocks.runProjectConsistencyCheck,
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
  createAzureSubscriptionProvider: vi.fn(() => Promise.resolve({})),
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
    mocks.getWorkspaceLogicAppRoots.mockResolvedValue(['D:\\workspace\\app-one']);

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

  it('catches up workspace consistency when the workspace loads before the folder listener is registered', async () => {
    (vscode.workspace as any).workspaceFolders = undefined;
    mocks.registerEvent.mockImplementation(() => {
      (vscode.workspace as any).workspaceFolders = [{ uri: vscode.Uri.file('D:\\workspace\\app-one'), name: 'app-one', index: 0 }];
    });

    await activate(createExtensionContext());
    await flushPromises();
    await Promise.all(backgroundOperations);

    expect(mocks.runProjectConsistencyCheck).toHaveBeenCalledTimes(1);
  });

  it('catches up workspace consistency when startup switches between nonempty workspaces before listener registration', async () => {
    (vscode.workspace as any).workspaceFolders = [{ uri: vscode.Uri.file('D:\\workspace\\app-one'), name: 'app-one', index: 0 }];
    mocks.registerEvent.mockImplementation(() => {
      (vscode.workspace as any).workspaceFolders = [{ uri: vscode.Uri.file('D:\\workspace\\app-two'), name: 'app-two', index: 0 }];
    });

    await activate(createExtensionContext());
    await flushPromises();
    await Promise.all(backgroundOperations);

    expect(mocks.runProjectConsistencyCheck).toHaveBeenCalledTimes(1);
  });

  it('does not duplicate catch-up when the workspace listener observes the startup folder change', async () => {
    (vscode.workspace as any).workspaceFolders = undefined;
    mocks.registerEvent.mockImplementation((_eventName, _event, listener) => {
      (vscode.workspace as any).workspaceFolders = [{ uri: vscode.Uri.file('D:\\workspace\\app-one'), name: 'app-one', index: 0 }];
      return listener(createActionContext());
    });

    await activate(createExtensionContext());
    await flushPromises();
    await Promise.all(backgroundOperations);

    expect(mocks.runProjectConsistencyCheck).toHaveBeenCalledTimes(1);
  });

  it('multi-root launch binds the attested Func through PATH after the REAL non-managed ensureBinaries branch overwrites a profile pin', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'multi-root-activation-unit-'));
    const configured = new Map<string, unknown>();
    let configurationSpy: ReturnType<typeof vi.spyOn> | undefined;
    try {
      fs.mkdirSync(path.join(root, 'FuncCoreTools'));
      const executable = path.join(root, 'FuncCoreTools', process.platform === 'win32' ? 'func.exe' : 'func');
      fs.writeFileSync(executable, 'unit-owned-nonexecutable-fixture-never-run');
      const request = bootstrapRequest({
        LA_E2E_CLI_MULTI_ROOT_BOOTSTRAP_ATTESTATION: path.join(root, 'attestation.json'),
        LA_E2E_CLI_MULTI_ROOT_BOOTSTRAP_CONTEXT: JSON.stringify({
          suiteId: 'workspaceMultiRoot',
          invocation: 'activation-unit',
          runtimeRoot: fs.realpathSync(root),
          startedUtc: new Date(Date.now() - 1000).toISOString(),
          identity: { source: 'unit', run: 'unit', job: 'unit', platform: process.platform },
        }),
      });
      if (!request) {
        throw new Error('Unit bootstrap request missing');
      }
      writeBootstrapAttestation(
        request,
        snapshotBootstrapBinary(request.context, executable),
        ['configured launcher fixture=4.1.2', 'in-proc8 fixture=4.1.2'],
        'unit-Code'
      );
      const admitted = readBootstrapAttestation(request.file, request.context, {
        phaseId: 'runtimeDependencyBootstrap:bootstrap',
        complete: true,
        exitCode: 0,
        signal: null,
        cleanupVerified: true,
      });
      const launch = multiRootRegularLaunch(admitted, process.env, path.join(root, 'profile'));
      for (const [key, value] of Object.entries(launch.settings)) {
        configured.set(key.replace(/^azureLogicAppsStandard\./, ''), value);
      }
      // Deliberately reproduce the rejected pin-only configuration. The real
      // main.activate -> ensureBinaries implementation must overwrite this.
      configured.set('funcCoreToolsBinaryPath', executable);
      configurationSpy = vi.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue({
        inspect: <T>(key: string) => ({ globalValue: configured.get(key) as T }),
      } as unknown as vscode.WorkspaceConfiguration);
      const actualSettings = await vi.importActual<typeof import('../app/utils/vsCodeConfig/settings')>(
        '../app/utils/vsCodeConfig/settings'
      );
      vi.mocked(shouldValidateAndInstallRuntimeDependencies).mockImplementation(actualSettings.shouldValidateAndInstallRuntimeDependencies);
      vi.mocked(getGlobalSetting).mockImplementation(actualSettings.getGlobalSetting);
      vi.mocked(updateGlobalSetting).mockImplementation(async (key, value) => {
        configured.set(key, value);
      });
      expect(await binaries.useBinariesDependencies()).toBe(false);

      await activate(createExtensionContext());
      await Promise.all(backgroundOperations);
      expect(updateGlobalSetting).toHaveBeenCalledWith('funcCoreToolsBinaryPath', 'func');
      expect(configured.get('funcCoreToolsBinaryPath')).toBe('func');
      expect(validateAndInstallBinaries).not.toHaveBeenCalled();
      const actualVersion = await vi.importActual<typeof import('../app/utils/funcCoreTools/funcVersion')>(
        '../app/utils/funcCoreTools/funcVersion'
      );
      const actualCommand = actualVersion.getFunctionsCommand();
      expect(actualCommand).toBe('func');
      const observed = observeFuncRuntime(actualCommand, false, admitted.runtimeRoot, launch.env);
      assertFuncRuntimeResolution(observed, admitted);
      // Same actual rewritten command, but no controlled PATH: the old pin
      // cannot establish identity and must fail instead of passing this control.
      const unbound = { ...launch.env, [process.platform === 'win32' ? 'Path' : 'PATH']: root };
      expect(() => observeFuncRuntime(actualCommand, false, admitted.runtimeRoot, unbound)).toThrow(/PATH does not lead/);
    } finally {
      configurationSpy?.mockRestore();
      vi.mocked(getGlobalSetting).mockReset();
      vi.mocked(shouldValidateAndInstallRuntimeDependencies).mockReset();
      vi.mocked(updateGlobalSetting).mockReset();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
