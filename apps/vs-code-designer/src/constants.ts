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

// Functions
export const func = 'func';
export const functionsExtensionId = 'ms-azuretools.vscode-azurefunctions';
export const workerRuntimeKey = 'FUNCTIONS_WORKER_RUNTIME';
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
  openDesigner = 'logicAppsExtension.openDesigner',
  loadMore = 'logicAppsExtension.loadMore',
  activate = 'logicAppsExtension.activate',
  selectSubscriptions = 'logicAppsExtension.selectSubscriptions',
  viewContent = 'logicAppsExtension.viewContent',
  openFile = 'logicAppsExtension.openFile',
  createNewProject = 'logicAppsExtension.createNewProject',
  createCodeless = 'logicAppsExtension.createCodeless',
  createLogicApp = 'logicAppsExtension.createLogicApp',
  createLogicAppAdvanced = 'logicAppsExtension.createLogicAppAdvanced',
  deploy = 'logicAppsExtension.deploy',
  deploySlot = 'logicAppsExtension.deploySlot',
  redeploy = 'logicAppsExtension.redeploy',
  showOutputChannel = 'logicAppsExtension.showOutputChannel',
  startLogicApp = 'logicAppsExtension.startLogicApp',
  stopLogicApp = 'logicAppsExtension.stopLogicApp',
  restartLogicApp = 'logicAppsExtension.restartLogicApp',
  pickProcess = 'logicAppsExtension.pickProcess',
  getDebugSymbolDll = 'logicAppsExtension.getDebugSymbolDll',
  deleteLogicApp = 'logicAppsExtension.deleteLogicApp',
  refresh = 'logicAppsExtension.refresh',
  switchToDotnetProject = 'logicAppsExtension.switchToDotnetProject',
  openInPortal = 'logicAppsExtension.openInPortal',
  azureFunctionsOpenFile = 'azureFunctions.openFile',
  azureFunctionsUninstallFuncCoreTools = 'azureFunctions.uninstallFuncCoreTools',
  azureFunctionsAppSettingsEncrypt = 'azureFunctions.appSettings.encrypt',
  azureFunctionsAppSettingsDecrypt = 'azureFunctions.appSettings.decrypt',
  azureSelectSubscriptions = 'azure-account.selectSubscriptions',
  openOverview = 'logicAppsExtension.openOverview',
  exportLogicApp = 'logicAppsExtension.exportLogicApp',
  browseWebsite = 'logicAppsExtension.browseWebsite',
  viewProperties = 'logicAppsExtension.viewProperties',
  createSlot = 'logicAppsExtension.createSlot',
  deleteSlot = 'logicAppsExtension.deleteSlot',
  startStreamingLogs = 'logicAppsExtension.startStreamingLogs',
  stopStreamingLogs = 'logicAppsExtension.stopStreamingLogs',
  viewDeploymentLogs = 'logicAppsExtension.viewDeploymentLogs',
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

// .NET
export enum DotnetVersion {
  net6 = 'net6.0',
  net3 = 'netcoreapp3.1',
  net2 = 'netcoreapp2.1',
  net48 = 'net48',
}

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
