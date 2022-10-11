import {
  localSettingsFileName,
  workflowTenantIdKey,
  workflowSubscriptionIdKey,
  workflowResourceGroupNameKey,
  workflowLocationKey,
  workflowManagementBaseURIKey,
} from '../../../constants';
import { ext } from '../../../extensionVariables';
import { createAzureWizard } from '../../commands/workflows/azureConnectorWizard';
import type { IAzureConnectorsContext } from '../../commands/workflows/azureConnectorWizard';
import { getLocalSettingsJson } from '../../funcConfig/local.settings';
import { getAuthorizationToken } from './getAuthorizationToken';
import type { WorkflowParameter } from './types';
import type { ServiceClientCredentials } from '@azure/ms-rest-js';
import type { Parameter, CodelessApp, Artifacts, AzureConnectorDetails } from '@microsoft-logic-apps/utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as fse from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import type { WebviewPanel } from 'vscode';

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

export function getCodelessAppData(workflowName: string, workflow: any, parameters: Record<string, Parameter>): CodelessApp {
  const { definition, kind, runtimeConfiguration } = workflow;
  const statelessRunMode = runtimeConfiguration && runtimeConfiguration.statelessRunMode ? runtimeConfiguration.statelessRunMode : '';
  const operationOptions = runtimeConfiguration && runtimeConfiguration.operationOptions ? runtimeConfiguration.operationOptions : '';
  const workflowParameters = getWorkflowParameters(parameters);

  return {
    statelessRunMode,
    definition: {
      ...definition,
      parameters: workflowParameters,
    },
    name: workflowName,
    stateful: kind === 'Stateful',
    kind,
    operationOptions,
  };
}

export function getTriggerName(definition: any): string | undefined {
  const { triggers } = definition;
  const triggerNames = Object.keys(triggers);

  // NOTE(psamband): Since we only support single trigger in Standard LA, we default to first trigger.
  return triggerNames.length === 1 ? triggerNames[0] : undefined;
}

function getWorkflowParameters(parameters: Record<string, Parameter>): Record<string, WorkflowParameter> {
  const workflowParameters: Record<string, WorkflowParameter> = {};
  for (const parameterKey of Object.keys(parameters)) {
    const parameter = parameters[parameterKey];
    workflowParameters[parameterKey] = {
      ...parameter,
      defaultValue: parameter.value,
    };
  }
  return workflowParameters;
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
  let workflowManagementBaseUrl = localSettings.Values![workflowManagementBaseURIKey] ?? 'https://management.azure.com/';

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
    accessToken: enabled ? await getAuthorizationToken(credentials!, tenantId) : undefined,
    subscriptionId: enabled ? subscriptionId : undefined,
    resourceGroupName: enabled ? resourceGroupName : undefined,
    location: enabled ? location : undefined,
    tenantId: enabled ? tenantId : undefined,
    workflowManagementBaseUrl: enabled ? workflowManagementBaseUrl : undefined,
  };
}
