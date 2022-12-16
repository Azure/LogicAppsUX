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

// Functions
export const func = 'func';
export const functionsExtensionId = 'ms-azuretools.vscode-azurefunctions';
export const workerRuntimeKey = 'FUNCTIONS_WORKER_RUNTIME';

// Workflow
export const workflowLocationKey = 'WORKFLOWS_LOCATION_NAME';
export const workflowResourceGroupNameKey = 'WORKFLOWS_RESOURCE_GROUP_NAME';
export const workflowSubscriptionIdKey = 'WORKFLOWS_SUBSCRIPTION_ID';
export const workflowTenantIdKey = 'WORKFLOWS_TENANT_ID';
export const workflowManagementBaseURIKey = 'WORKFLOWS_MANAGEMENT_BASE_URI';
export const workflowAppApiVersion = '2018-11-01';
export const azureWebJobsStorageKey = 'AzureWebJobsStorage';

export const logicAppKind = 'workflowapp';
export const workflowappRuntime = 'node|14';

export const viewOutput = localize('viewOutput', 'View Output');

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
  azureFunctionsOpenFile = 'azureFunctions.openFile',
  azureSelectSubscriptions = 'azure-account.selectSubscriptions',
}

// Context
export const contextValuePrefix = 'azFunc';

// API
export const defaultRoutePrefix = 'api';
export const timeoutKey = 'requestTimeout';

// Tree
export const contextValueSeparator = ';';

// Git
export const gitCommand = 'git';

// Project
export const projectLanguageSetting = 'projectLanguage';
export const funcVersionSetting = 'projectRuntime';
export const projectSubpathSetting = 'projectSubpath';
export const projectTemplateKeySetting = 'projectTemplateKey';
export const projectOpenBehaviorSetting = 'projectOpenBehavior';
export const defaultBundleId = 'Microsoft.Azure.Functions.ExtensionBundle';
export const defaultVersionRange = '[1.*, 2.0.0)'; // Might need to be changed
export const hostStartCommand = 'host start';
export const funcWatchProblemMatcher = '$func-watch';
export const extInstallCommand = 'extensions install';
export const extInstallTaskName = `${func}: ${extInstallCommand}`;

export const deploySubpathSetting = 'deploySubpath';
export const tasksVersion = '2.0.0';
export const launchVersion = '0.2.0';
export const preDeployTaskSetting = 'preDeployTask';
export const dotnetPublishTaskLabel = 'publish';

// local.settings.json
export const localEmulatorConnectionString = 'UseDevelopmentStorage=true';
