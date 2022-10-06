/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from './localize';

export const projectLanguageSetting = 'projectLanguage';
export const funcVersionSetting = 'projectRuntime'; // Using this name for the sake of backwards compatability even though it's not the most accurate
export const projectSubpathSetting = 'projectSubpath';
export const templateFilterSetting = 'templateFilter';
export const deploySubpathSetting = 'deploySubpath';
export const templateVersionSetting = 'templateVersion';
export const preDeployTaskSetting = 'preDeployTask';
export const projectOpenBehaviorSetting = 'projectOpenBehavior';
export const projectTemplateKeySetting = 'projectTemplateKey';
export const pomXmlFileName = 'pom.xml';
export const javaBuildTool = 'javaBuildTool';

export enum JavaBuildTool {
  maven = 'maven',
  gradle = 'gradle',
}

export enum ProjectLanguage {
  CSharp = 'C#',
  CSharpScript = 'C#Script',
  FSharp = 'F#',
  FSharpScript = 'F#Script',
  Java = 'Java',
  JavaScript = 'JavaScript',
  PowerShell = 'PowerShell',
  TypeScript = 'TypeScript',
  Python = 'Python',
  Custom = 'Custom',
}

export enum WorkflowProjectType {
  Nuget = 'Nuget',
  Bundle = 'Bundle',
}

export enum TemplateFilter {
  All = 'All',
  Core = 'Core',
  Verified = 'Verified',
}

export const hostFileName = 'host.json';
export const localSettingsFileName = 'local.settings.json';
export const functionJsonFileName = 'function.json';
export const tasksFileName = 'tasks.json';
export const launchFileName = 'launch.json';
export const settingsFileName = 'settings.json';
export const vscodeFolderName = '.vscode';
export const gitignoreFileName = '.gitignore';
export const requirementsFileName = 'requirements.txt';
export const connectionsFileName = 'connections.json';
export const parametersFileName = 'parameters.json';
export const funcignoreFileName = '.funcignore';

export enum PackageManager {
  npm = 'npm',
  brew = 'brew',
}

export const funcPackageName = 'azure-functions-core-tools';

export enum ScmType {
  None = 'None', // default scmType
  LocalGit = 'LocalGit',
  GitHub = 'GitHub',
}

export const functionAppKind = 'functionapp';
export const logicAppKind = 'workflowapp';
export const logicAppKindAppSetting = 'workflowApp';
export const dotnetPublishTaskLabel = 'publish';
export const javaPackageTaskLabel = 'package';
export const kubernetesKind = 'kubernetes';

export const func = 'func';
export const extInstallCommand = 'extensions install';
export const extInstallTaskName = `${func}: ${extInstallCommand}`;

export const hostStartCommand = 'host start';
export const hostStartTaskName = `${func}: ${hostStartCommand}`;

export const packCommand = 'pack';
export const buildNativeDeps = '--build-native-deps';
export const packTaskName = `${func}: ${packCommand}`;

export const funcWatchProblemMatcher = '$func-watch';

export const localhost = '127.0.0.1';

export const workflowAppApiVersion = '2018-11-01';

export const tsDefaultOutDir = 'dist';
export const tsConfigFileName = 'tsconfig.json';

export const localEmulatorConnectionString = 'UseDevelopmentStorage=true';

export const workerRuntimeKey = 'FUNCTIONS_WORKER_RUNTIME';
export const extensionVersionKey = 'FUNCTIONS_EXTENSION_VERSION';

export const webhookRedirectHostUri = 'Workflows.WebhookRedirectHostUri';
export const workflowLocationKey = 'WORKFLOWS_LOCATION_NAME';
export const workflowResourceGroupNameKey = 'WORKFLOWS_RESOURCE_GROUP_NAME';
export const workflowSubscriptionIdKey = 'WORKFLOWS_SUBSCRIPTION_ID';
export const workflowTenantIdKey = 'WORKFLOWS_TENANT_ID';
export const workflowManagementBaseURIKey = 'WORKFLOWS_MANAGEMENT_BASE_URI';

export const viewOutput = localize('viewOutput', 'View Output');

export const workflowAppAADClientId = 'WORKFLOWAPP_AAD_CLIENTID';
export const workflowAppAADObjectId = 'WORKFLOWAPP_AAD_OBJECTID';
export const workflowAppAADTenantId = 'WORKFLOWAPP_AAD_TENANTID';
export const workflowAppAADClientSecret = 'WORKFLOWAPP_AAD_CLIENTSECRET';

export const managementApiPrefix = '/runtime/webhooks/workflow/api/management';
export const designerStartApi = '/runtime/webhooks/workflow/api/management/operationGroups';

export const workflowappRuntime = 'node|14';

export const workflowDesignerLoadTimeout = 300000;
export const debugSymbolDll = 'Microsoft.Azure.Workflows.BuildTasks.DebugSymbolGenerator.dll';

export const azureWebJobsSecretStorageTypeKey = 'AzureWebJobsSecretStorageType';
export const sqlStorageConnectionStringKey = 'Workflows.Sql.ConnectionString';

export const functionFilter = {
  type: 'microsoft.web/sites',
  kind: 'functionapp',
};
