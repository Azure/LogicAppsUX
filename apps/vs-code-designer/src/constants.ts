/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from './localize';

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
export const workflowDesignTimeDir = '/workflow-designtime';

export const logicAppsStandardExtensionId = 'ms-azuretools.vscode-azurelogicapps';

// Functions
export const func = 'func';
export const functionsExtensionId = 'ms-azuretools.vscode-azurefunctions';
export const workerRuntimeKey = 'FUNCTIONS_WORKER_RUNTIME';
export const ProjectDirectoryPath = 'ProjectDirectoryPath';
export const extensionVersionKey = 'FUNCTIONS_EXTENSION_VERSION';
export const hostStartCommand = 'host start';
export const hostStartTaskName = `${func}: ${hostStartCommand}`;
export const funcPackageName = 'azure-functions-core-tools';
export const defaultFuncPort = '7071';
export const isolatedSdkName = 'Microsoft.Azure.Functions.Worker.Sdk';

// Workflow
export const workflowLocationKey = 'WORKFLOWS_LOCATION_NAME';
export const workflowResourceGroupNameKey = 'WORKFLOWS_RESOURCE_GROUP_NAME';
export const workflowSubscriptionIdKey = 'WORKFLOWS_SUBSCRIPTION_ID';
export const workflowTenantIdKey = 'WORKFLOWS_TENANT_ID';
export const workflowManagementBaseURIKey = 'WORKFLOWS_MANAGEMENT_BASE_URI';
export const workflowAppApiVersion = '2018-11-01';
export const azureWebJobsStorageKey = 'AzureWebJobsStorage';
export const workflowappRuntime = 'node|14';
export const viewOutput = localize('viewOutput', 'View Output');
export const webhookRedirectHostUri = 'Workflows.WebhookRedirectHostUri';
export const workflowAppAADClientId = 'WORKFLOWAPP_AAD_CLIENTID';
export const workflowAppAADObjectId = 'WORKFLOWAPP_AAD_OBJECTID';
export const workflowAppAADTenantId = 'WORKFLOWAPP_AAD_TENANTID';
export const workflowAppAADClientSecret = 'WORKFLOWAPP_AAD_CLIENTSECRET';
export const debugSymbolDll = 'Microsoft.Azure.Workflows.BuildTasks.DebugSymbolGenerator.dll';

export enum workflowType {
  stateful = 'Stateful-Codeless',
  stateless = 'Stateless-Codeless',
}

// Designer
export const managementApiPrefix = '/runtime/webhooks/workflow/api/management';
export const designerStartApi = '/runtime/webhooks/workflow/api/management/operationGroups';
export const workflowDesignerLoadTimeout = 300000;

// Commands
export enum extensionCommand {
  openDesigner = 'azureLogicAppsStandard.openDesigner',
  activate = 'azureLogicAppsStandard.activate',
  viewContent = 'azureLogicAppsStandard.viewContent',
  openFile = 'azureLogicAppsStandard.openFile',
  createNewProject = 'azureLogicAppsStandard.createNewProject',
  createNewCodeProject = 'azureLogicAppsStandard.createNewCodeProject',
  createNewDataMap = 'azureLogicAppsStandard.dataMap.createNewDataMap',
  createCodeless = 'azureLogicAppsStandard.createCodeless',
  createLogicApp = 'azureLogicAppsStandard.createLogicApp',
  createLogicAppAdvanced = 'azureLogicAppsStandard.createLogicAppAdvanced',
  deploy = 'azureLogicAppsStandard.deploy',
  deploySlot = 'azureLogicAppsStandard.deploySlot',
  redeploy = 'azureLogicAppsStandard.redeploy',
  showOutputChannel = 'azureLogicAppsStandard.showOutputChannel',
  startLogicApp = 'azureLogicAppsStandard.startLogicApp',
  stopLogicApp = 'azureLogicAppsStandard.stopLogicApp',
  restartLogicApp = 'azureLogicAppsStandard.restartLogicApp',
  pickProcess = 'azureLogicAppsStandard.pickProcess',
  getDebugSymbolDll = 'azureLogicAppsStandard.getDebugSymbolDll',
  deleteLogicApp = 'azureLogicAppsStandard.deleteLogicApp',
  switchToDotnetProject = 'azureLogicAppsStandard.switchToDotnetProject',
  openInPortal = 'azureLogicAppsStandard.openInPortal',
  azureFunctionsOpenFile = 'azureFunctions.openFile',
  azureFunctionsUninstallFuncCoreTools = 'azureFunctions.uninstallFuncCoreTools',
  azureFunctionsAppSettingsEncrypt = 'azureFunctions.appSettings.encrypt',
  azureFunctionsAppSettingsDecrypt = 'azureFunctions.appSettings.decrypt',
  openOverview = 'azureLogicAppsStandard.openOverview',
  exportLogicApp = 'azureLogicAppsStandard.exportLogicApp',
  reviewValidation = 'azureLogicAppsStandard.reviewValidation',
  browseWebsite = 'azureLogicAppsStandard.browseWebsite',
  viewProperties = 'azureLogicAppsStandard.viewProperties',
  createSlot = 'azureLogicAppsStandard.createSlot',
  deleteSlot = 'azureLogicAppsStandard.deleteSlot',
  swapSlot = 'azureLogicAppsStandard.swapSlot',
  startStreamingLogs = 'azureLogicAppsStandard.startStreamingLogs',
  stopStreamingLogs = 'azureLogicAppsStandard.stopStreamingLogs',
  viewDeploymentLogs = 'azureLogicAppsStandard.viewDeploymentLogs',
  appSettingsAdd = 'azureLogicAppsStandard.appSettings.add',
  appSettingsDelete = 'azureLogicAppsStandard.appSettings.delete',
  appSettingsDownload = 'azureLogicAppsStandard.appSettings.download',
  appSettingsEdit = 'azureLogicAppsStandard.appSettings.edit',
  appSettingsRename = 'azureLogicAppsStandard.appSettings.rename',
  appSettingsUpload = 'azureLogicAppsStandard.appSettings.upload',
  appSettingsToggleSlotSetting = 'azureLogicAppsStandard.appSettings.toggleSlotSetting',
  toggleAppSettingVisibility = 'azureLogicAppsStandard.toggleAppSettingVisibility',
  useSQLStorage = 'azureLogicAppsStandard.useSQLStorage',
  switchDebugMode = 'azureLogicAppsStandard.switchDebugMode',
  connectToGitHub = 'azureLogicAppsStandard.connectToGitHub',
  disconnectRepo = 'azureLogicAppsStandard.disconnectRepo',
  viewCommitInGitHub = 'azureLogicAppsStandard.viewCommitInGitHub',
  enableAzureConnectors = 'azureLogicAppsStandard.enableAzureConnectors',
  configureWebhookRedirectEndpoint = 'azureLogicAppsStandard.configureWebhookRedirectEndpoint',
  initProjectForVSCode = 'azureLogicAppsStandard.initProjectForVSCode',
  configureDeploymentSource = 'azureLogicAppsStandard.configureDeploymentSource',
  startRemoteDebug = 'azureLogicAppsStandard.startRemoteDebug',
  validateLogicAppProjects = 'azureLogicAppsStandard.validateFunctionProjects',
  reportIssue = 'azureLogicAppsStandard.reportIssue',
  loadDataMapFile = 'azureLogicAppsStandard.dataMap.loadDataMapFile',
  dataMapAddSchemaFromFile = 'azureLogicAppsStandard.dataMap.addSchemaFromFile',
  dataMapAttemptToResolveMissingSchemaFile = 'azureLogicAppsStandard.dataMap.attemptToResolveMissingSchemaFile',
  dataMapSetSupportedDataMapDefinitionFileExts = 'azureLogicAppsStandard.dataMap.setSupportedDataMapDefinitionFileExts',
  dataMapSetSupportedSchemaFileExts = 'azureLogicAppsStandard.dataMap.setSupportedSchemaFileExts',
  dataMapSetSupportedFileExts = 'azureLogicAppsStandard.dataMap.setSupportedFileExts',
  dataMapSaveMapDefinition = 'azureLogicAppsStandard.dataMap.saveMapDefinition',
  dataMapSaveMapXslt = 'azureLogicAppsStandard.dataMap.saveMapXslt',
}

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
export const funcVersionSetting = 'projectRuntime';
export const projectSubpathSetting = 'projectSubpath';
export const projectTemplateKeySetting = 'projectTemplateKey';
export const projectOpenBehaviorSetting = 'projectOpenBehavior';
export const stopFuncTaskPostDebugSetting = 'stopFuncTaskPostDebug';
export const validateFuncCoreToolsSetting = 'validateFuncCoreTools';
export const showDeployConfirmationSetting = 'showDeployConfirmation';
export const deploySubpathSetting = 'deploySubpath';
export const preDeployTaskSetting = 'preDeployTask';
export const pickProcessTimeoutSetting = 'pickProcessTimeout';
export const show64BitWarningSetting = 'show64BitWarning';
export const showProjectWarningSetting = 'showProjectWarning';
export const showTargetFrameworkWarningSetting = 'showTargetFrameworkWarning';

// Project
export const defaultBundleId = 'Microsoft.Azure.Functions.ExtensionBundle';
export const defaultVersionRange = '[1.*, 2.0.0)'; // Might need to be changed
export const funcWatchProblemMatcher = '$func-watch';
export const extInstallCommand = 'extensions install';
export const extInstallTaskName = `${func}: ${extInstallCommand}`;
export const tasksVersion = '2.0.0';
export const launchVersion = '0.2.0';
export const dotnetPublishTaskLabel = 'publish';

// local.settings.json
export const localEmulatorConnectionString = 'UseDevelopmentStorage=true';

// host.json
export const extensionBundleId = 'Microsoft.Azure.Functions.ExtensionBundle.Workflows';
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

// .NET
export enum DotnetVersion {
  net6 = 'net6.0',
  net3 = 'netcoreapp3.1',
  net2 = 'netcoreapp2.1',
  net48 = 'net48',
}
export const dotnetExtensionId = 'ms-dotnettools.csharp';

// Packages Manager
export enum PackageManager {
  npm = 'npm',
  brew = 'brew',
}

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
