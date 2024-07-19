/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from './localize';
import * as os from 'os';
import * as path from 'path';

// File names
export const hostFileName = 'host.json';
export const localSettingsFileName = 'local.settings.json';
export const connectionsFileName = 'connections.json';
export const parametersFileName = 'parameters.json';
export const gitignoreFileName = '.gitignore';
export const tasksFileName = 'tasks.json';
export const launchFileName = 'launch.json';
export const settingsFileName = 'settings.json';
export const extensionsFileName = 'extensions.json';
export const vscodeFolderName = '.vscode';
export const workflowFileName = 'workflow.json';
export const funcIgnoreFileName = '.funcignore';

// Folder names
export const designTimeDirectoryName = 'workflow-designtime';

export const logicAppsStandardExtensionId = 'ms-azuretools.vscode-azurelogicapps';

// Azurite
export const azuriteExtensionId = 'Azurite.azurite';
export const azuriteExtensionPrefix = 'azurite';
export const azuriteLocationSetting = 'location';

// Functions
export const func = 'func';
export const functionsExtensionId = 'ms-azuretools.vscode-azurefunctions';
export const hostStartCommand = 'host start';
export const hostStartTaskName = `${func}: ${hostStartCommand}`;
export const funcPackageName = 'azure-functions-core-tools';
export const defaultFuncPort = '7071';
export const isolatedSdkName = 'Microsoft.Azure.Functions.Worker.Sdk';
export const funcDependencyName = 'FuncCoreTools';

// DotNet
export const dotnet = 'dotnet';
export const dotnetDependencyName = 'DotNetSDK';

// Node
export const node = 'node';
export const npm = 'npm';
export const nodeJsDependencyName = 'NodeJs';

// Workflow
export const workflowLocationKey = 'WORKFLOWS_LOCATION_NAME';
export const workflowResourceGroupNameKey = 'WORKFLOWS_RESOURCE_GROUP_NAME';
export const workflowSubscriptionIdKey = 'WORKFLOWS_SUBSCRIPTION_ID';
export const workflowTenantIdKey = 'WORKFLOWS_TENANT_ID';
export const workflowManagementBaseURIKey = 'WORKFLOWS_MANAGEMENT_BASE_URI';
export const workflowAppApiVersion = '2018-11-01';
export const azureWebJobsStorageKey = 'AzureWebJobsStorage';
export const azureWebJobsSecretStorageTypeKey = 'AzureWebJobsSecretStorageType';
export const workflowappRuntime = 'node|18';
export const viewOutput = localize('viewOutput', 'View Output');
export const webhookRedirectHostUri = 'Workflows.WebhookRedirectHostUri';
export const workflowAppAADClientId = 'WORKFLOWAPP_AAD_CLIENTID';
export const workflowAppAADObjectId = 'WORKFLOWAPP_AAD_OBJECTID';
export const workflowAppAADTenantId = 'WORKFLOWAPP_AAD_TENANTID';
export const workflowAppAADClientSecret = 'WORKFLOWAPP_AAD_CLIENTSECRET';
export const debugSymbolDll = 'Microsoft.Azure.Workflows.BuildTasks.DebugSymbolGenerator.dll';

export const workflowType = {
  stateful: 'Stateful-Codeless',
  stateless: 'Stateless-Codeless',
} as const;
export type workflowType = (typeof workflowType)[keyof typeof workflowType];

export const workflowKind = {
  stateful: 'Stateful',
  stateless: 'Stateless',
} as const;
export type workflowKind = (typeof workflowKind)[keyof typeof workflowKind];

// Designer
export const managementApiPrefix = '/runtime/webhooks/workflow/api/management';
export const designerStartApi = '/runtime/webhooks/workflow/api/management/operationGroups';
export const designerApiLoadTimeout = 300000;

// Commands
export const extensionCommand = {
  openDesigner: 'azureLogicAppsStandard.openDesigner',
  activate: 'azureLogicAppsStandard.activate',
  viewContent: 'azureLogicAppsStandard.viewContent',
  openFile: 'azureLogicAppsStandard.openFile',
  createNewProject: 'azureLogicAppsStandard.createNewProject',
  createNewCodeProject: 'azureLogicAppsStandard.createNewCodeProject',
  createNewDataMap: 'azureLogicAppsStandard.dataMap.createNewDataMap',
  createCodeless: 'azureLogicAppsStandard.createCodeless',
  createLogicApp: 'azureLogicAppsStandard.createLogicApp',
  createLogicAppAdvanced: 'azureLogicAppsStandard.createLogicAppAdvanced',
  deploy: 'azureLogicAppsStandard.deploy',
  generateDeploymentScripts: 'azureLogicAppsStandard.generateDeploymentScripts',
  deploySlot: 'azureLogicAppsStandard.deploySlot',
  redeploy: 'azureLogicAppsStandard.redeploy',
  showOutputChannel: 'azureLogicAppsStandard.showOutputChannel',
  startLogicApp: 'azureLogicAppsStandard.startLogicApp',
  stopLogicApp: 'azureLogicAppsStandard.stopLogicApp',
  restartLogicApp: 'azureLogicAppsStandard.restartLogicApp',
  pickProcess: 'azureLogicAppsStandard.pickProcess',
  getDebugSymbolDll: 'azureLogicAppsStandard.getDebugSymbolDll',
  deleteLogicApp: 'azureLogicAppsStandard.deleteLogicApp',
  switchToDotnetProject: 'azureLogicAppsStandard.switchToDotnetProject',
  openInPortal: 'azureLogicAppsStandard.openInPortal',
  azureFunctionsOpenFile: 'azureFunctions.openFile',
  azureFunctionsUninstallFuncCoreTools: 'azureFunctions.uninstallFuncCoreTools',
  azureFunctionsAppSettingsEncrypt: 'azureFunctions.appSettings.encrypt',
  azureFunctionsAppSettingsDecrypt: 'azureFunctions.appSettings.decrypt',
  openOverview: 'azureLogicAppsStandard.openOverview',
  exportLogicApp: 'azureLogicAppsStandard.exportLogicApp',
  reviewValidation: 'azureLogicAppsStandard.reviewValidation',
  browseWebsite: 'azureLogicAppsStandard.browseWebsite',
  viewProperties: 'azureLogicAppsStandard.viewProperties',
  createSlot: 'azureLogicAppsStandard.createSlot',
  deleteSlot: 'azureLogicAppsStandard.deleteSlot',
  swapSlot: 'azureLogicAppsStandard.swapSlot',
  startStreamingLogs: 'azureLogicAppsStandard.startStreamingLogs',
  stopStreamingLogs: 'azureLogicAppsStandard.stopStreamingLogs',
  viewDeploymentLogs: 'azureLogicAppsStandard.viewDeploymentLogs',
  appSettingsAdd: 'azureLogicAppsStandard.appSettings.add',
  appSettingsDelete: 'azureLogicAppsStandard.appSettings.delete',
  appSettingsDownload: 'azureLogicAppsStandard.appSettings.download',
  appSettingsEdit: 'azureLogicAppsStandard.appSettings.edit',
  appSettingsRename: 'azureLogicAppsStandard.appSettings.rename',
  appSettingsUpload: 'azureLogicAppsStandard.appSettings.upload',
  appSettingsToggleSlotSetting: 'azureLogicAppsStandard.appSettings.toggleSlotSetting',
  toggleAppSettingVisibility: 'azureLogicAppsStandard.toggleAppSettingVisibility',
  useSQLStorage: 'azureLogicAppsStandard.useSQLStorage',
  switchDebugMode: 'azureLogicAppsStandard.switchDebugMode',
  connectToGitHub: 'azureLogicAppsStandard.connectToGitHub',
  disconnectRepo: 'azureLogicAppsStandard.disconnectRepo',
  viewCommitInGitHub: 'azureLogicAppsStandard.viewCommitInGitHub',
  enableAzureConnectors: 'azureLogicAppsStandard.enableAzureConnectors',
  configureWebhookRedirectEndpoint: 'azureLogicAppsStandard.configureWebhookRedirectEndpoint',
  initProjectForVSCode: 'azureLogicAppsStandard.initProjectForVSCode',
  configureDeploymentSource: 'azureLogicAppsStandard.configureDeploymentSource',
  startRemoteDebug: 'azureLogicAppsStandard.startRemoteDebug',
  validateLogicAppProjects: 'azureLogicAppsStandard.validateFunctionProjects',
  reportIssue: 'azureLogicAppsStandard.reportIssue',
  validateAndInstallBinaries: 'azureLogicAppsStandard.validateAndInstallBinaries',
  resetValidateAndInstallBinaries: 'azureLogicAppsStandard.resetValidateAndInstallBinaries',
  disableValidateAndInstallBinaries: 'azureLogicAppsStandard.disableValidateAndInstallBinaries',
  azureAzuriteStart: 'azurite.start',
  parameterizeConnections: 'azureLogicAppsStandard.parameterizeConnections',
  loadDataMapFile: 'azureLogicAppsStandard.dataMap.loadDataMapFile',
  dataMapAddSchemaFromFile: 'azureLogicAppsStandard.dataMap.addSchemaFromFile',
  dataMapAttemptToResolveMissingSchemaFile: 'azureLogicAppsStandard.dataMap.attemptToResolveMissingSchemaFile',
  dataMapSetSupportedDataMapDefinitionFileExts: 'azureLogicAppsStandard.dataMap.setSupportedDataMapDefinitionFileExts',
  dataMapSetSupportedSchemaFileExts: 'azureLogicAppsStandard.dataMap.setSupportedSchemaFileExts',
  dataMapSetSupportedFileExts: 'azureLogicAppsStandard.dataMap.setSupportedFileExts',
  dataMapSaveMapDefinition: 'azureLogicAppsStandard.dataMap.saveMapDefinition',
  dataMapSaveMapXslt: 'azureLogicAppsStandard.dataMap.saveMapXslt',
  vscodeOpenFolder: 'vscode.openFolder',
} as const;
export type extensionCommand = (typeof extensionCommand)[keyof typeof extensionCommand];

// Context
export const contextValuePrefix = 'azLogicApps';

// API
export const defaultRoutePrefix = 'api';
export const timeoutKey = 'requestTimeout';

// Tree
export const contextValueSeparator = ';';

// Git
export const gitCommand = 'git';

// Project settings
export const projectLanguageSetting = 'projectLanguage';
export const dataMapperVersionSetting = 'dataMapperVersion';
export const funcVersionSetting = 'projectRuntime';
export const projectSubpathSetting = 'projectSubpath';
export const projectTemplateKeySetting = 'projectTemplateKey';
export const projectOpenBehaviorSetting = 'projectOpenBehavior';
export const stopFuncTaskPostDebugSetting = 'stopFuncTaskPostDebug';
export const validateFuncCoreToolsSetting = 'validateFuncCoreTools';
export const validateDotNetSDKSetting = 'validateDotNetSDK';
export const validateNodeJsSetting = 'validateNodeJs';
export const showDeployConfirmationSetting = 'showDeployConfirmation';
export const deploySubpathSetting = 'deploySubpath';
export const preDeployTaskSetting = 'preDeployTask';
export const pickProcessTimeoutSetting = 'pickProcessTimeout';
export const show64BitWarningSetting = 'show64BitWarning';
export const showProjectWarningSetting = 'showProjectWarning';
export const showTargetFrameworkWarningSetting = 'showTargetFrameworkWarning';
export const showStartDesignTimeMessageSetting = 'showStartDesignTimeMessage';
export const autoStartDesignTimeSetting = 'autoStartDesignTime';
export const autoRuntimeDependenciesValidationAndInstallationSetting = 'autoRuntimeDependenciesValidationAndInstallation';
export const azuriteBinariesLocationSetting = 'azuriteLocationSetting';
export const parameterizeConnectionsInProjectLoadSetting = 'parameterizeConnectionsInProjectLoad';
export const showAutoStartAzuriteWarning = 'showAutoStartAzuriteWarning';
export const autoStartAzuriteSetting = 'autoStartAzurite';
export const autoRuntimeDependenciesPathSettingKey = 'autoRuntimeDependenciesPath';
export const dotNetBinaryPathSettingKey = 'dotnetBinaryPath';
export const nodeJsBinaryPathSettingKey = 'nodeJsBinaryPath';
export const funcCoreToolsBinaryPathSettingKey = 'funcCoreToolsBinaryPath';
export const dependencyTimeoutSettingKey = 'dependencyTimeout';
export const verifyConnectionKeysSetting = 'verifyConnectionKeys';

// host.json
export const extensionBundleId = 'Microsoft.Azure.Functions.ExtensionBundle.Workflows';
export const targetBundleKey = 'FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI';

// local.settings.json
export const localEmulatorConnectionString = 'UseDevelopmentStorage=true';
export const appKindSetting = 'APP_KIND';
export const workerRuntimeKey = 'FUNCTIONS_WORKER_RUNTIME';
export const ProjectDirectoryPath = 'ProjectDirectoryPath';
export const extensionVersionKey = 'FUNCTIONS_EXTENSION_VERSION';
export const azureStorageTypeSetting = 'Files';
// Project
export const defaultVersionRange = '[1.*, 2.0.0)'; // Might need to be changed
export const funcWatchProblemMatcher = '$func-watch';
export const extInstallCommand = 'extensions install';
export const extInstallTaskName = `${func}: ${extInstallCommand}`;
export const tasksVersion = '2.0.0';
export const launchVersion = '0.2.0';
export const dotnetPublishTaskLabel = 'publish';
export const defaultLogicAppsFolder = '.azurelogicapps';
export const defaultFunctionCoreToolsFolder = '.azure-functions-core-tools';
export const defaultAzuritePathValue = path.join(os.homedir(), defaultLogicAppsFolder, '.azurite');
export const defaultDependencyPathValue = path.join(os.homedir(), defaultLogicAppsFolder, 'dependencies');
export const defaultExtensionBundlePathValue = path.join(
  os.homedir(),
  defaultFunctionCoreToolsFolder,
  'Functions',
  'ExtensionBundles',
  extensionBundleId
);
export const defaultDataMapperVersion = 1;

// Fallback Dependency Versions
export const DependencyVersion = {
  dotnet6: '6.0.413',
  funcCoreTools: '4.0.5455',
  nodeJs: '18.17.1',
} as const;
export type DependencyVersion = (typeof DependencyVersion)[keyof typeof DependencyVersion];

export const hostFileContent = {
  version: '2.0',
  extensionBundle: {
    id: extensionBundleId,
    version: defaultVersionRange,
  },
  extensions: {
    workflow: {
      settings: {
        'Runtime.WorkflowOperationDiscoveryHostMode': 'true',
      },
    },
  },
};

export const DependencyDefaultPath = {
  dotnet: 'dotnet',
  funcCoreTools: 'func',
  node: 'node',
} as const;
export type DependencyDefaultPath = (typeof DependencyDefaultPath)[keyof typeof DependencyDefaultPath];
// .NET
export const DotnetVersion = {
  net6: 'net6.0',
  net3: 'netcoreapp3.1',
  net2: 'netcoreapp2.1',
  net48: 'net48',
} as const;
export type DotnetVersion = (typeof DotnetVersion)[keyof typeof DotnetVersion];

export const dotnetExtensionId = 'ms-dotnettools.csharp';

// Packages Manager
export const PackageManager = {
  npm: 'npm',
  brew: 'brew',
} as const;
export type PackageManager = (typeof PackageManager)[keyof typeof PackageManager];
// Operating System Platforms
export const Platform = {
  windows: 'win32',
  mac: 'darwin',
  linux: 'linux',
} as const;
export type Platform = (typeof Platform)[keyof typeof Platform];

// Resources
export const kubernetesKind = 'kubernetes';
export const functionAppKind = 'functionapp';
export const logicAppKind = 'workflowapp';
export const logicAppKindAppSetting = 'workflowApp';

export const sqlStorageConnectionStringKey = 'Workflows.Sql.ConnectionString';

export const logicAppFilter = {
  type: 'microsoft.web/sites',
  kind: 'functionapp,workflowapp',
};

export const COMMON_ERRORS = {
  OPERATION_CANCELLED: 'Operation cancelled',
} as const;
export type COMMON_ERRORS = (typeof COMMON_ERRORS)[keyof typeof COMMON_ERRORS];
// Environment Variables
export const azurePublicBaseUrl = 'https://management.azure.com';
