import {
  localSettingsFileName,
  workflowTenantIdKey,
  workflowSubscriptionIdKey,
  workflowResourceGroupNameKey,
  workflowLocationKey,
  workflowManagementBaseURIKey,
  managementApiPrefix,
  workflowFileName,
} from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { createAzureWizard } from '../../commands/workflows/azureConnectorWizard';
import type { IAzureConnectorsContext } from '../../commands/workflows/azureConnectorWizard';
import type { RemoteWorkflowTreeItem } from '../../tree/remoteWorkflowsTree/RemoteWorkflowTreeItem';
import { getLocalSettingsJson } from '../appSettings/localSettings';
import { getAuthorizationToken } from './getAuthorizationToken';
import type { ServiceClientCredentials } from '@azure/ms-rest-js';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { DialogResponses } from '@microsoft/vscode-azext-utils';
import type { IWorkflowFileContent, StandardApp, Artifacts, AzureConnectorDetails, ILocalSettingsJson } from '@microsoft/vscode-extension';
import { readFileSync } from 'fs';
import * as fse from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import type { MessageItem, WebviewPanel } from 'vscode';

export function tryGetWebviewPanel(category: string, name: string): WebviewPanel | undefined {
  const currentPanels = ext.openWebviewPanels[category];
  return currentPanels ? currentPanels[name] : undefined;
}

export function cacheWebviewPanel(category: string, name: string, panel: WebviewPanel): void {
  const currentPanels = ext.openWebviewPanels[category];

  if (currentPanels) {
    currentPanels[name] = panel;
  }
}

export function removeWebviewPanelFromCache(category: string, name: string): void {
  const currentPanels = ext.openWebviewPanels[category];

  if (currentPanels) {
    delete currentPanels[name];
  }
}

export function getStandardAppData(workflowName: string, workflow: IWorkflowFileContent): StandardApp {
  const { definition, kind, runtimeConfiguration } = workflow;
  const statelessRunMode = runtimeConfiguration && runtimeConfiguration.statelessRunMode ? runtimeConfiguration.statelessRunMode : '';
  const operationOptions = runtimeConfiguration && runtimeConfiguration.operationOptions ? runtimeConfiguration.operationOptions : '';

  return {
    statelessRunMode,
    definition,
    name: workflowName,
    stateful: kind === 'Stateful',
    kind,
    operationOptions,
  };
}

export async function updateFuncIgnore(projectPath: string, variables: string[]) {
  const funcIgnorePath: string = path.join(projectPath, '.funcignore');
  let funcIgnoreContents: string | undefined;
  if (await fse.pathExists(funcIgnorePath)) {
    funcIgnoreContents = (await fse.readFile(funcIgnorePath)).toString();
    for (const variable of variables) {
      if (funcIgnoreContents && !funcIgnoreContents.includes(variable)) {
        funcIgnoreContents = funcIgnoreContents.concat(`${os.EOL}${variable}`);
      }
    }
  }

  if (!funcIgnoreContents) {
    funcIgnoreContents = variables.join(os.EOL);
  }

  await fse.writeFile(funcIgnorePath, funcIgnoreContents);
}

export async function getArtifactsInLocalProject(projectPath: string): Promise<Artifacts> {
  const artifacts: Artifacts = {
    maps: {},
    schemas: [],
  };
  const artifactsPath = path.join(projectPath, 'Artifacts');
  const mapsPath = path.join(projectPath, 'Artifacts', 'Maps');
  const schemasPath = path.join(projectPath, 'Artifacts', 'Schemas');

  if (!(await fse.pathExists(projectPath)) || !(await fse.pathExists(artifactsPath))) {
    return artifacts;
  }

  if (await fse.pathExists(mapsPath)) {
    const subPaths: string[] = await fse.readdir(mapsPath);

    for (const subPath of subPaths) {
      const fullPath: string = path.join(mapsPath, subPath);
      const fileStats = await fse.lstat(fullPath);

      if (fileStats.isFile()) {
        const extensionName = path.extname(subPath);
        const name = path.basename(subPath, extensionName);
        const normalizedExtensionName = extensionName.toLowerCase();

        if (!artifacts.maps[normalizedExtensionName]) {
          artifacts.maps[normalizedExtensionName] = [];
        }

        artifacts.maps[normalizedExtensionName].push({ name, fileName: subPath, relativePath: path.join('Artifacts', 'Maps', subPath) });
      }
    }
  }

  if (await fse.pathExists(schemasPath)) {
    const subPaths: string[] = await fse.readdir(schemasPath);

    for (const subPath of subPaths) {
      const fullPath: string = path.join(schemasPath, subPath);
      const fileStats = await fse.lstat(fullPath);

      if (fileStats.isFile()) {
        const extensionName = path.extname(subPath);
        const name = path.basename(subPath, extensionName);

        artifacts.schemas.push({ name, fileName: subPath, relativePath: path.join('Artifacts', 'Schemas', subPath) });
      }
    }
  }

  return artifacts;
}

export async function getAzureConnectorDetailsForLocalProject(
  context: IActionContext,
  projectPath: string
): Promise<AzureConnectorDetails> {
  const localSettingsFilePath = path.join(projectPath, localSettingsFileName);
  const connectorsContext = context as IAzureConnectorsContext;
  const localSettings = await getLocalSettingsJson(context, localSettingsFilePath);
  let tenantId = localSettings.Values[workflowTenantIdKey];
  let subscriptionId = localSettings.Values[workflowSubscriptionIdKey];
  let resourceGroupName = localSettings.Values[workflowResourceGroupNameKey];
  let location = localSettings.Values[workflowLocationKey];
  let credentials: ServiceClientCredentials;

  // Set default for customers who created Logic Apps before sovereign cloud support was added.
  let workflowManagementBaseUrl = localSettings.Values[workflowManagementBaseURIKey] ?? 'https://management.azure.com/';

  if (subscriptionId === undefined) {
    const wizard = createAzureWizard(connectorsContext, projectPath);
    await wizard.prompt();
    await wizard.execute();

    tenantId = connectorsContext.tenantId;
    subscriptionId = connectorsContext.subscriptionId;
    resourceGroupName = connectorsContext.resourceGroup?.name || '';
    location = connectorsContext.resourceGroup?.location || '';
    credentials = connectorsContext.credentials;
    workflowManagementBaseUrl = connectorsContext.environment?.resourceManagerEndpointUrl;
  }

  const enabled = !!subscriptionId;

  return {
    enabled,
    accessToken: enabled ? await getAuthorizationToken(credentials, tenantId) : undefined,
    subscriptionId: enabled ? subscriptionId : undefined,
    resourceGroupName: enabled ? resourceGroupName : undefined,
    location: enabled ? location : undefined,
    tenantId: enabled ? tenantId : undefined,
    workflowManagementBaseUrl: enabled ? workflowManagementBaseUrl : undefined,
  };
}

export async function getManualWorkflowsInLocalProject(projectPath: string, workflowToExclude: string): Promise<Record<string, any>> {
  if (!(await fse.pathExists(projectPath))) {
    return {};
  }

  const workflowDetails: Record<string, any> = {};
  const subPaths: string[] = await fse.readdir(projectPath);
  for (const subPath of subPaths) {
    const fullPath: string = path.join(projectPath, subPath);
    const fileStats = await fse.lstat(fullPath);

    if (fileStats.isDirectory() && subPath !== workflowToExclude) {
      try {
        const workflowFilePath = path.join(fullPath, workflowFileName);

        if (await fse.pathExists(workflowFilePath)) {
          const schema = getRequestTriggerSchema(JSON.parse(readFileSync(workflowFilePath, 'utf8')));

          if (schema) {
            workflowDetails[subPath] = schema;
          }
        }
      } catch {
        // If unable to load the workflow or read the definition we skip the workflow
        // in child workflow list.
      }
    }
  }

  return workflowDetails;
}

/**
 * Retrieves the workflows in a local project.
 * @param {string} projectPath - The path to the project.
 * @returns A promise that resolves to a record of workflow names and their corresponding schemas.
 */
export async function getWorkflowsInLocalProject(projectPath: string): Promise<Record<string, StandardApp>> {
  if (!(await fse.pathExists(projectPath))) {
    return {};
  }

  const workflowDetails: Record<string, any> = {};
  const subPaths: string[] = await fse.readdir(projectPath);
  for (const subPath of subPaths) {
    const fullPath: string = path.join(projectPath, subPath);
    const fileStats = await fse.lstat(fullPath);

    if (fileStats.isDirectory()) {
      try {
        const workflowFilePath = path.join(fullPath, workflowFileName);

        if (await fse.pathExists(workflowFilePath)) {
          const schema = JSON.parse(readFileSync(workflowFilePath, 'utf8'));
          if (schema) {
            workflowDetails[subPath] = schema;
          }
        }
      } catch {
        // If unable to load the workflow or read the definition we skip the workflow
      }
    }
  }

  return workflowDetails;
}

export function getRequestTriggerSchema(workflowContent: IWorkflowFileContent): any {
  const {
    definition: { triggers },
  } = workflowContent;
  const triggerNames = Object.keys(triggers);

  if (triggerNames.length === 1) {
    const trigger = triggers[triggerNames[0]];
    if (trigger.type.toLowerCase() === 'request') {
      return trigger.inputs && trigger.inputs.schema ? trigger.inputs.schema : {};
    }
  }

  return undefined;
}

export function getWorkflowManagementBaseURI(node: RemoteWorkflowTreeItem): string {
  let resourceManagerUri: string = node.parent.subscription.environment.resourceManagerEndpointUrl;
  if (resourceManagerUri.endsWith('/')) {
    resourceManagerUri = resourceManagerUri.slice(0, -1);
  }
  return `${resourceManagerUri}${node.parent.parent.id}/hostruntime${managementApiPrefix}`;
}

/**
 * Verifies local and remot and resource group are the same, otherwise propmts message.
 * @param {IActionContext} context - Command context.
 * @param {string} workflowResourceGroupRemote - Remote resource group name.
 * @param {string} originalDeployFsPath - Workflow path to deploy.
 */
export async function verifyDeploymentResourceGroup(
  context: IActionContext,
  workflowResourceGroupRemote: string,
  originalDeployFsPath: string
): Promise<void> {
  const localSettings: ILocalSettingsJson = await getLocalSettingsJson(context, path.join(originalDeployFsPath, localSettingsFileName));
  const workflowResourceGroupLocal: string = localSettings.Values[workflowResourceGroupNameKey];

  if (workflowResourceGroupLocal && workflowResourceGroupLocal.toLowerCase() !== workflowResourceGroupRemote.toLowerCase()) {
    const warning: string = localize(
      'resourceGroupMismatch',
      'For optimal performance, put managed connections in the same resource group as your workflow. Are you sure you want to deploy?'
    );
    const deployButton: MessageItem = { title: localize('deploy', 'Deploy') };
    await context.ui.showWarningMessage(warning, { modal: true }, deployButton, DialogResponses.cancel);
  }
}

export function getTriggerName(definition: any): string | undefined {
  const { triggers } = definition;
  const triggerNames = Object.keys(triggers);
  return triggerNames.length === 1 ? triggerNames[0] : undefined;
}
