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
export const cloudSettingsFileName = 'cloud.settings.json';
export const connectionsFileName = 'connections.json';
export const parametersFileName = 'parameters.json';
export const gitignoreFileName = '.gitignore';
export const tasksFileName = 'tasks.json';
export const launchFileName = 'launch.json';
export const settingsFileName = 'settings.json';
export const extensionsFileName = 'extensions.json';
export const workflowFileName = 'workflow.json';
export const codefulWorkflowFileName = 'workflow.cs';
export const funcIgnoreFileName = '.funcignore';
export const unitTestsFileName = '.unit-test.json';
export const powershellRequirementsFileName = 'requirements.psd1';

// Directories names
export const deploymentDirectory = 'deployment';
export const diagnosticsDirectory = 'diagnostics';
export const locksDirectory = 'locks';
export const wwwrootDirectory = 'wwwroot';
export const artifactsDirectory = 'Artifacts';
export const libDirectory = 'lib';
export const mapsDirectory = 'Maps';
export const schemasDirectory = 'Schemas';
export const rulesDirectory = 'Rules';

// Extension Id
// Folder names
export const designTimeDirectoryName = 'workflow-designtime';
export const testsDirectoryName = 'Tests';
export const testMockOutputsDirectory = 'MockOutputs';
export const testResultsDirectoryName = '.testResults';
export const vscodeFolderName = '.vscode';
export const assetsFolderName = 'assets';
export const deploymentScriptTemplatesFolderName = 'DeploymentScriptTemplates';

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
export const customConnectorResourceGroupNameKey = 'CUSTOM_CONNECTOR_RESOURCE_GROUP_NAME';
export const workflowSubscriptionIdKey = 'WORKFLOWS_SUBSCRIPTION_ID';
export const workflowTenantIdKey = 'WORKFLOWS_TENANT_ID';
export const workflowManagementBaseURIKey = 'WORKFLOWS_MANAGEMENT_BASE_URI';
export const workflowAppApiVersion = '2018-11-01';
export const hybridAppApiVersion = '2024-02-02-preview';
export const azureWebJobsStorageKey = 'AzureWebJobsStorage';
export const functionsInprocNet8Enabled = 'FUNCTIONS_INPROC_NET8_ENABLED';
export const functionsInprocNet8EnabledTrue = '1';
export const azureWebJobsSecretStorageTypeKey = 'AzureWebJobsSecretStorageType';
export const workflowappRuntime = 'node|18';
export const viewOutput = localize('viewOutput', 'View Output');
export const webhookRedirectHostUri = 'Workflows.WebhookRedirectHostUri';
export const workflowAppAADClientId = 'WORKFLOWAPP_AAD_CLIENTID';
export const workflowAppAADObjectId = 'WORKFLOWAPP_AAD_OBJECTID';
export const workflowAppAADTenantId = 'WORKFLOWAPP_AAD_TENANTID';
export const workflowAppAADClientSecret = 'WORKFLOWAPP_AAD_CLIENTSECRET';
export const debugSymbolDll = 'Microsoft.Azure.Workflows.BuildTasks.DebugSymbolGenerator.dll';

export const WorkflowType = {
  stateful: 'Stateful-Codeless',
  stateless: 'Stateless-Codeless',
  agentic: 'Agentic-Codeless',
} as const;
export type WorkflowType = (typeof WorkflowType)[keyof typeof WorkflowType];

export const workflowCodeType = {
  codeful: 'Codeful',
  codeless: 'Codeless',
} as const;
export type workflowCodeType = (typeof workflowCodeType)[keyof typeof workflowCodeType];

export const WorkflowKind = {
  stateful: 'Stateful',
  stateless: 'Stateless',
  agentic: 'Agentic',
  agent: 'Agent',
} as const;
export type WorkflowKind = (typeof WorkflowKind)[keyof typeof WorkflowKind];

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
  createNewWorkspace: 'azureLogicAppsStandard.createNewWorkspace',
  cloudToLocal: 'azureLogicAppsStandard.cloudToLocal',
  buildCustomCodeFunctionsProject: 'azureLogicAppsStandard.buildCustomCodeFunctionsProject',
  customCodeSetFunctionsFolders: 'azureLogicAppsStandard.customCode.setFunctionsFolders',
  createCustomCodeFunction: 'azureLogicAppsStandard.createCustomCodeFunction',
  createNewDataMap: 'azureLogicAppsStandard.dataMap.createNewDataMap',
  createWorkflow: 'azureLogicAppsStandard.createWorkflow',
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
  pickCustomCodeNetHostProcess: 'azureLogicAppsStandard.pickCustomCodeNetHostProcess',
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
  syncCloudSettings: 'azureLogicAppsStandard.syncCloudSettings',
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
  dataMapSetDmFolders: 'azureLogicAppsStandard.dataMap.setDmFolders',
  dataMapSaveMapDefinition: 'azureLogicAppsStandard.dataMap.saveMapDefinition',
  dataMapSaveMapXslt: 'azureLogicAppsStandard.dataMap.saveMapXslt',
  createUnitTest: 'azureLogicAppsStandard.createUnitTest',
  saveBlankUnitTest: 'azureLogicAppsStandard.saveBlankUnitTest',
  vscodeOpenFolder: 'vscode.openFolder',
  debugLogicApp: 'azureLogicAppsStandard.debugLogicApp',
  switchToDataMapperV2: 'azureLogicAppsStandard.dataMap.switchToDataMapperV2',
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
export const driveLetterSMBSetting = 'driveLetterSMB';
export const parameterizeConnectionsInProjectLoadSetting = 'parameterizeConnectionsInProjectLoad';
export const showAutoStartAzuriteWarning = 'showAutoStartAzuriteWarning';
export const autoStartAzuriteSetting = 'autoStartAzurite';
export const autoRuntimeDependenciesPathSettingKey = 'autoRuntimeDependenciesPath';
export const dotNetBinaryPathSettingKey = 'dotnetBinaryPath';
export const nodeJsBinaryPathSettingKey = 'nodeJsBinaryPath';
export const funcCoreToolsBinaryPathSettingKey = 'funcCoreToolsBinaryPath';
export const dependencyTimeoutSettingKey = 'dependencyTimeout';
export const unitTestExplorer = 'unitTestExplorer';
export const verifyConnectionKeysSetting = 'verifyConnectionKeys';
export const useSmbDeployment = 'useSmbDeploymentForHybrid';

// host.json
export const extensionBundleId = 'Microsoft.Azure.Functions.ExtensionBundle.Workflows';
export const targetBundleKey = 'FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI';

// local.settings.json
export const localEmulatorConnectionString = 'UseDevelopmentStorage=true';
export const appKindSetting = 'APP_KIND';
export const sqlStorageConnectionStringKey = 'Workflows.Sql.ConnectionString';

export const workerRuntimeKey = 'FUNCTIONS_WORKER_RUNTIME';
export const ProjectDirectoryPathKey = 'ProjectDirectoryPath';
export const extensionVersionKey = 'FUNCTIONS_EXTENSION_VERSION';
export const azureStorageTypeSetting = 'Files';
export const isZipDeployEnabledSetting = 'IS_ZIP_DEPLOY_ENABLED';
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
export const defaultDataMapperVersion = 2;

// Fallback Dependency Versions
export const DependencyVersion = {
  dotnet6: '6.0.413',
  funcCoreTools: '4.0.7030',
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
  net8: 'net8.0',
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

export const logicAppFilter = {
  type: 'microsoft.web/sites',
  kind: 'functionapp,workflowapp',
};

// Telemetry Events
export const saveUnitTestEvent = 'saveUnitTestDefinition';
export const runUnitTestEvent = 'runUnitTest';
// Container Apps
export const containerAppsId = 'containerApps';
export const managedEnvironmentsId = 'managedEnvironments';

// Resources providers
export const appProvider = 'Microsoft.App';
export const webProvider = 'Microsoft.Web';
export const operationalInsightsProvider = 'Microsoft.OperationalInsights';
export const storageProvider = 'Microsoft.Storage';
export const insightsProvider = 'Microsoft.Insights';
export const managedEnvironmentsAppProvider = `${appProvider}/${managedEnvironmentsId}`;

export const DirectoryKind = {
  directory: 'directory',
  file: 'file',
} as const;

// App settings
export const WEBSITE_CONTENTAZUREFILECONNECTIONSTRING = 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING';
export const COMMON_ERRORS = {
  OPERATION_CANCELLED: 'Operation cancelled',
} as const;
export type COMMON_ERRORS = (typeof COMMON_ERRORS)[keyof typeof COMMON_ERRORS];
// Environment Variables
export const azurePublicBaseUrl = 'https://management.azure.com';
export const sqlConnectionStringSecretName = 'sqlconnectionstring';
export const clientSecretName = 'clientsecret';

//Regex validations
export const workflowNameValidation = /^[a-z][a-z0-9]*(?:[_-][a-z0-9]+)*$/i;
export const logicAppNameValidation = /^[a-z][a-z0-9]*(?:[_-][a-z0-9]+)*$/i;
export const dataMapNameValidation = /^[a-z][a-z0-9]*(?:[_-][a-z0-9]+)*$/i;
export const workspaceNameValidation = /^[a-z][a-z0-9]*(?:[_-][a-z0-9]+)*$/i;
export const deployedLogicAppNameValidation = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,62}[a-zA-Z0-9])?$/;
export const deployedStorageAccountNameValidation = /^[a-z0-9]{3,24}$/;
export const deployedAppServicePlanNameValidation = /^[a-zA-Z0-9-]{1,60}$/;
export const namespaceValidation = /^([A-Za-z_][A-Za-z0-9_]*)(\.[A-Za-z_][A-Za-z0-9_]*)*$/;

// Codeful SDK versions
export const CodefulSDKs = {
  DurableTask: 'Microsoft.Azure.WebJobs.Extensions.DurableTask',
  WorkflowsWebJobs: 'Microsoft.Azure.Workflows.WebJobs.Extension',
  WorkflowsSDK: 'Microsoft.Azure.Workflows.Sdk',
};
export type CodefulSDKs = (typeof CodefulSDKs)[keyof typeof CodefulSDKs];

const codefulSdkVersion = '1.127.21.3-preview';
const workflowsWebJobsVersion = '1.127.21.3-preview';
const durableTaskVersion = '2.9.0';

export const CodefulSdkVersions = {
  [CodefulSDKs.DurableTask]: durableTaskVersion,
  [CodefulSDKs.WorkflowsWebJobs]: workflowsWebJobsVersion,
  [CodefulSDKs.WorkflowsSDK]: codefulSdkVersion,
};
