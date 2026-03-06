import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted mock variables for registration functions
const {
  mockRegisterCommand,
  mockRegisterCommandWithTreeNodeUnwrapping,
  mockRegisterSiteCommand,
  mockRegisterErrorHandler,
  mockRegisterReportIssueCommand,
  mockUnwrapTreeNodeCommandCallback,
  mockParseError,
  mockGuid,
} = vi.hoisted(() => ({
  mockRegisterCommand: vi.fn(),
  mockRegisterCommandWithTreeNodeUnwrapping: vi.fn(),
  mockRegisterSiteCommand: vi.fn(),
  mockRegisterErrorHandler: vi.fn(),
  mockRegisterReportIssueCommand: vi.fn(),
  mockUnwrapTreeNodeCommandCallback: vi.fn((cb: any) => cb),
  mockParseError: vi.fn(() => ({ message: 'mock error' })),
  mockGuid: vi.fn(() => 'test-guid'),
}));

// Mock @microsoft/vscode-azext-utils with all needed exports
vi.mock('@microsoft/vscode-azext-utils', () => ({
  registerCommand: mockRegisterCommand,
  registerCommandWithTreeNodeUnwrapping: mockRegisterCommandWithTreeNodeUnwrapping,
  registerErrorHandler: mockRegisterErrorHandler,
  registerReportIssueCommand: mockRegisterReportIssueCommand,
  unwrapTreeNodeCommandCallback: mockUnwrapTreeNodeCommandCallback,
  parseError: mockParseError,
  UserCancelledError: class UserCancelledError extends Error {
    constructor(name?: string) {
      super('Operation cancelled');
      this.name = name || 'UserCancelledError';
    }
  },
  AzureWizardPromptStep: vi.fn(),
  AzureWizardExecuteStep: vi.fn(),
  AzureWizard: class {
    async prompt() {}
    async execute() {}
  },
  nonNullProp: vi.fn(),
  nonNullValue: vi.fn(),
  nonNullOrEmptyValue: vi.fn((v: any) => v),
  callWithTelemetryAndErrorHandling: vi.fn(),
  DialogResponses: vi.fn(),
  AzExtTreeItem: class {},
  AzExtParentTreeItem: class {},
  openUrl: vi.fn(),
}));

vi.mock('@microsoft/vscode-azext-azureappservice', () => ({
  registerSiteCommand: mockRegisterSiteCommand,
}));

vi.mock('@microsoft/vscode-azext-azureappsettings', () => ({
  AppSettingsTreeItem: { contextValue: 'appSettings' },
  AppSettingTreeItem: { contextValue: 'appSetting' },
}));

vi.mock('@microsoft/logic-apps-shared', () => ({
  guid: mockGuid,
}));

vi.mock('../../../localize', () => ({
  localize: (_key: string, defaultValue: string, ...args: any[]) => {
    let result = defaultValue;
    args.forEach((arg, i) => {
      result = result.replace(`{${i}}`, String(arg));
    });
    return result;
  },
}));

// Mock all command handler modules with auto-generated vi.fn() exports
vi.mock('../../functionsExtension/executeOnFunctionsExt', () => ({ executeOnFunctions: vi.fn() }));
vi.mock('../../tree/LogicAppResourceTree', () => ({ LogicAppResourceTree: { pickSlotContextValue: 'slot' } }));
vi.mock('../appSettings/downloadAppSettings', () => ({ downloadAppSettings: vi.fn() }));
vi.mock('../appSettings/editAppSetting', () => ({ editAppSetting: vi.fn() }));
vi.mock('../appSettings/renameAppSetting', () => ({ renameAppSetting: vi.fn() }));
vi.mock('../appSettings/toggleSlotSetting', () => ({ toggleSlotSetting: vi.fn() }));
vi.mock('../appSettings/uploadAppSettings', () => ({ uploadAppSettings: vi.fn() }));
vi.mock('../binaries/resetValidateAndInstallBinaries', () => ({
  disableValidateAndInstallBinaries: vi.fn(),
  resetValidateAndInstallBinaries: vi.fn(),
}));
vi.mock('../binaries/validateAndInstallBinaries', () => ({ validateAndInstallBinaries: vi.fn() }));
vi.mock('../browseWebsite', () => ({ browseWebsite: vi.fn() }));
vi.mock('../buildCustomCodeFunctionsProject', () => ({ tryBuildCustomCodeFunctionsProject: vi.fn() }));
vi.mock('../configureDeploymentSource', () => ({ configureDeploymentSource: vi.fn() }));
vi.mock('../createChildNode', () => ({ createChildNode: vi.fn() }));
vi.mock('../createLogicApp/createLogicApp', () => ({ createLogicApp: vi.fn(), createLogicAppAdvanced: vi.fn() }));
vi.mock('../cloudToLocal/cloudToLocal', () => ({ cloudToLocal: vi.fn() }));
vi.mock('../createWorkspace/createWorkspace', () => ({ createNewCodeProjectFromCommand: vi.fn() }));
vi.mock('../createProject/createProject', () => ({ createNewProjectFromCommand: vi.fn() }));
vi.mock('../createCustomCodeFunction/createCustomCodeFunction', () => ({ createCustomCodeFunction: vi.fn() }));
vi.mock('../createSlot', () => ({ createSlot: vi.fn() }));
vi.mock('../createWorkflow/createWorkflow', () => ({ createWorkflow: vi.fn() }));
vi.mock('../dataMapper/dataMapper', () => ({ createNewDataMapCmd: vi.fn(), loadDataMapFileCmd: vi.fn() }));
vi.mock('../deleteLogicApp/deleteLogicApp', () => ({ deleteLogicApp: vi.fn() }));
vi.mock('../deleteNode', () => ({ deleteNode: vi.fn() }));
vi.mock('../deploy/deploy', () => ({ deployProductionSlot: vi.fn(), deploySlot: vi.fn() }));
vi.mock('../deployments/connectToGitHub', () => ({ connectToGitHub: vi.fn() }));
vi.mock('../deployments/disconnectRepo', () => ({ disconnectRepo: vi.fn() }));
vi.mock('../deployments/redeployDeployment', () => ({ redeployDeployment: vi.fn() }));
vi.mock('../deployments/viewCommitInGitHub', () => ({ viewCommitInGitHub: vi.fn() }));
vi.mock('../deployments/viewDeploymentLogs', () => ({ viewDeploymentLogs: vi.fn() }));
vi.mock('../generateDeploymentScripts/generateDeploymentScripts', () => ({ generateDeploymentScripts: vi.fn() }));
vi.mock('../initProjectForVSCode/initProjectForVSCode', () => ({ initProjectForVSCode: vi.fn() }));
vi.mock('../logstream/startStreamingLogs', () => ({ startStreamingLogs: vi.fn() }));
vi.mock('../logstream/stopStreamingLogs', () => ({ stopStreamingLogs: vi.fn() }));
vi.mock('../openFile', () => ({ openFile: vi.fn() }));
vi.mock('../openInPortal', () => ({ openInPortal: vi.fn() }));
vi.mock('../parameterizeConnections', () => ({ parameterizeConnections: vi.fn() }));
vi.mock('../pickFuncProcess', () => ({ pickFuncProcess: vi.fn() }));
vi.mock('../remoteDebug/startRemoteDebug', () => ({ startRemoteDebug: vi.fn() }));
vi.mock('../restartLogicApp', () => ({ restartLogicApp: vi.fn() }));
vi.mock('../startLogicApp', () => ({ startLogicApp: vi.fn() }));
vi.mock('../stopLogicApp', () => ({ stopLogicApp: vi.fn() }));
vi.mock('../swapSlot', () => ({ swapSlot: vi.fn() }));
vi.mock('../viewProperties', () => ({ viewProperties: vi.fn() }));
vi.mock('../workflows/configureWebhookRedirectEndpoint/configureWebhookRedirectEndpoint', () => ({
  configureWebhookRedirectEndpoint: vi.fn(),
}));
vi.mock('../workflows/enableAzureConnectors', () => ({ enableAzureConnectors: vi.fn() }));
vi.mock('../workflows/exportLogicApp', () => ({ exportLogicApp: vi.fn() }));
vi.mock('../workflows/openDesigner/openDesigner', () => ({ openDesigner: vi.fn() }));
vi.mock('../workflows/openOverview', () => ({ openOverview: vi.fn() }));
vi.mock('../workflows/reviewValidation', () => ({ reviewValidation: vi.fn() }));
vi.mock('../workflows/switchDebugMode/switchDebugMode', () => ({ switchDebugMode: vi.fn() }));
vi.mock('../workflows/switchToDotnetProject', () => ({ switchToDotnetProjectCommand: vi.fn() }));
vi.mock('../workflows/useSQLStorage', () => ({ useSQLStorage: vi.fn() }));
vi.mock('../workflows/viewContent', () => ({ viewContent: vi.fn() }));
vi.mock('../pickCustomCodeWorkerProcess', () => ({ pickCustomCodeNetHostProcess: vi.fn() }));
vi.mock('../debugLogicApp', () => ({ debugLogicApp: vi.fn() }));
vi.mock('../syncCloudSettings', () => ({ syncCloudSettings: vi.fn() }));
vi.mock('../../utils/debug', () => ({ getDebugSymbolDll: vi.fn() }));
vi.mock('../setDataMapperVersion', () => ({ switchToDataMapperV2: vi.fn() }));
vi.mock('../../utils/reportAnIssue', () => ({ reportAnIssue: vi.fn() }));
vi.mock('../enableDevContainer/enableDevContainer', () => ({ enableDevContainer: vi.fn() }));

import { registerCommands } from '../registerCommands';

describe('registerCommands', () => {
  beforeEach(() => {
    mockRegisterCommand.mockReset();
    mockRegisterCommandWithTreeNodeUnwrapping.mockReset();
    mockRegisterSiteCommand.mockReset();
    mockRegisterErrorHandler.mockReset();
    mockRegisterReportIssueCommand.mockReset();
    mockUnwrapTreeNodeCommandCallback.mockReset();
    mockUnwrapTreeNodeCommandCallback.mockImplementation((cb: any) => cb);
    mockParseError.mockReset();
    mockParseError.mockReturnValue({ message: 'mock error' });
    mockGuid.mockReset();
    mockGuid.mockReturnValue('test-guid');
  });

  it('should call registerCommand for command registrations', () => {
    registerCommands();
    expect(mockRegisterCommand).toHaveBeenCalled();
  });

  it('should call registerCommandWithTreeNodeUnwrapping for tree node commands', () => {
    registerCommands();
    expect(mockRegisterCommandWithTreeNodeUnwrapping).toHaveBeenCalled();
  });

  it('should call registerSiteCommand for deploy-related commands', () => {
    registerCommands();
    expect(mockRegisterSiteCommand).toHaveBeenCalled();
  });

  it('should register error handler', () => {
    registerCommands();
    expect(mockRegisterErrorHandler).toHaveBeenCalledTimes(1);
    expect(mockRegisterErrorHandler).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should register report issue command', () => {
    registerCommands();
    expect(mockRegisterReportIssueCommand).toHaveBeenCalledTimes(1);
    expect(mockRegisterReportIssueCommand).toHaveBeenCalledWith('azureLogicAppsStandard.reportIssue');
  });

  it('should register expected number of commands', () => {
    registerCommands();
    const totalRegistrations =
      mockRegisterCommand.mock.calls.length +
      mockRegisterCommandWithTreeNodeUnwrapping.mock.calls.length +
      mockRegisterSiteCommand.mock.calls.length;
    // There should be many commands registered (at least 40+)
    expect(totalRegistrations).toBeGreaterThan(40);
  });

  describe('error handler', () => {
    it('should suppress report issue button for all errors', () => {
      registerCommands();
      const errorHandler = mockRegisterErrorHandler.mock.calls[0][0];
      const errorContext = {
        error: new Error('test error'),
        errorHandling: { suppressReportIssue: false, suppressDisplay: false, buttons: [] as any[] },
        telemetry: { properties: {}, measurements: {} },
      };

      errorHandler(errorContext);

      expect(errorContext.errorHandling.suppressReportIssue).toBe(true);
    });

    it('should suppress display and mark user-cancelled for UserCancelledError', async () => {
      registerCommands();
      const errorHandler = mockRegisterErrorHandler.mock.calls[0][0];

      // Import the UserCancelledError from the mock
      const { UserCancelledError } = await import('@microsoft/vscode-azext-utils');
      const cancelledError = new UserCancelledError();

      const errorContext = {
        error: cancelledError,
        errorHandling: { suppressReportIssue: false, suppressDisplay: false, buttons: [] as any[] },
        telemetry: { properties: {} as Record<string, string>, measurements: {} },
      };

      errorHandler(errorContext);

      expect(errorContext.errorHandling.suppressDisplay).toBe(true);
      expect(errorContext.telemetry.properties.isUserCancelled).toBe('true');
    });

    it('should add report issue button when display is not suppressed', () => {
      registerCommands();
      const errorHandler = mockRegisterErrorHandler.mock.calls[0][0];
      const errorContext = {
        error: new Error('test error'),
        errorHandling: { suppressReportIssue: false, suppressDisplay: false, buttons: [] as any[] },
        telemetry: { properties: {} as Record<string, string>, measurements: {} },
      };

      errorHandler(errorContext);

      expect(errorContext.errorHandling.buttons).toHaveLength(1);
      expect(errorContext.errorHandling.buttons[0].title).toBe('Report an issue');
    });

    it('should not add report issue button when display is suppressed', async () => {
      registerCommands();
      const errorHandler = mockRegisterErrorHandler.mock.calls[0][0];

      const { UserCancelledError } = await import('@microsoft/vscode-azext-utils');

      const errorContext = {
        error: new UserCancelledError(),
        errorHandling: { suppressReportIssue: false, suppressDisplay: false, buttons: [] as any[] },
        telemetry: { properties: {} as Record<string, string>, measurements: {} },
      };

      errorHandler(errorContext);

      // suppressDisplay is set to true for cancelled errors, so no button should be added
      expect(errorContext.errorHandling.suppressDisplay).toBe(true);
      expect(errorContext.errorHandling.buttons).toHaveLength(0);
    });

    it('should include correlation id and error info in telemetry', () => {
      registerCommands();
      const errorHandler = mockRegisterErrorHandler.mock.calls[0][0];
      const errorContext = {
        error: new Error('test error'),
        errorHandling: { suppressReportIssue: false, suppressDisplay: false, buttons: [] as any[] },
        telemetry: { properties: {} as Record<string, string>, measurements: {} },
      };

      errorHandler(errorContext);

      expect(errorContext.telemetry.properties.handlingData).toBeDefined();
      const handlingData = JSON.parse(errorContext.telemetry.properties.handlingData);
      expect(handlingData.correlationId).toBe('test-guid');
      expect(handlingData.message).toBe('mock error');
      expect(handlingData.extensionVersion).toBeDefined();
    });
  });
});
