/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { getRequestTriggerName, getTriggerName, HTTP_METHODS, isNullOrUndefined } from '@microsoft/logic-apps-shared';
import {
  assetsFolderName,
  localSettingsFileName,
  managementApiPrefix,
  workflowAppApiVersion,
  workflowTenantIdKey,
} from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { RemoteWorkflowTreeItem } from '../../tree/remoteWorkflowsTree/RemoteWorkflowTreeItem';
import { getLocalSettingsJson } from '../../utils/appSettings/localSettings';
import {
  cacheWebviewPanel,
  getAzureConnectorDetailsForLocalProject,
  getStandardAppData,
  getWorkflowManagementBaseURI,
  removeWebviewPanelFromCache,
  tryGetWebviewPanel,
} from '../../utils/codeless/common';
import { getConnectionsJson, getLogicAppProjectRoot } from '../../utils/codeless/connection';
import { getAuthorizationToken, getAuthorizationTokenFromNode } from '../../utils/codeless/getAuthorizationToken';
import { getWebViewHTML } from '../../utils/codeless/getWebViewHTML';
import { sendRequest } from '../../utils/requestUtils';
import { getWorkflowNode } from '../../utils/workspace';
import type { IAzureConnectorsContext } from './azureConnectorWizard';
import { openMonitoringView } from './openMonitoringView/openMonitoringView';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { AzureConnectorDetails, ICallbackUrlResponse } from '@microsoft/vscode-extension-logic-apps';
import { ExtensionCommand, ProjectName } from '@microsoft/vscode-extension-logic-apps';
import { readFileSync } from 'fs';
import { basename, dirname, join } from 'path';
import * as path from 'path';
import * as vscode from 'vscode';
import { launchProjectDebugger } from '../../utils/vsCodeConfig/launch';
import { isRuntimeUp } from '../../utils/startRuntimeApi';
import { detectCodefulWorkflow, extractTriggerNameFromCodeful, extractHttpTriggerName, hasHttpRequestTrigger } from '../../utils/codeful';
import { getCodefulWorkflowMetadata } from '../../languageServer/languageServer';

// TODO(aeldridge): We should split into remote and local open overview
export async function openOverview(context: IAzureConnectorsContext, node: vscode.Uri | RemoteWorkflowTreeItem | undefined): Promise<void> {
  let workflowFilePath: string;
  let workflowName = '';
  let workflowContent: any;
  let baseUrl: string | undefined;
  let getBaseUrl: () => string | undefined;
  let apiVersion: string;
  let accessToken: string;
  let getAccessToken: () => Promise<string>;
  let isLocal: boolean;
  let callbackInfo: ICallbackUrlResponse | undefined;
  let getCallbackInfo: (baseUrl: string) => Promise<ICallbackUrlResponse | undefined>;
  let panelName = '';
  let corsNotice: string | undefined;
  let localSettings: Record<string, string> = {};
  let connectionData: Record<string, any> = {};
  let azureDetails: AzureConnectorDetails;
  let triggerName: string;
  const workflowNode = getWorkflowNode(node);
  const panelGroupKey = ext.webViewKey.overview;

  if (workflowNode instanceof vscode.Uri) {
    workflowFilePath = workflowNode.fsPath;

    const projectPath = await getLogicAppProjectRoot(context, workflowFilePath);
    if (!isNullOrUndefined(projectPath) && !(await isRuntimeUp(ext.workflowRuntimePort))) {
      await launchProjectDebugger(context, projectPath);
    }
    getBaseUrl = () => (ext.workflowRuntimePort ? `http://localhost:${ext.workflowRuntimePort}${managementApiPrefix}` : undefined);
    baseUrl = getBaseUrl?.();
    apiVersion = '2019-10-01-edge-preview';
    isLocal = true;
    if (!baseUrl) {
      ext.outputChannel.appendLog(
        localize(
          'overviewCallbackUrlUnavailable',
          'Callback URL is not available because the workflow runtime is not running. Start debugging or run "func host start" to enable the Run Trigger button.'
        )
      );
    }

    if (workflowFilePath.endsWith('.cs')) {
      // Codeful workflow
      let workflowKind: string;
      let hasHttpTrigger: boolean;
      const fileContent = readFileSync(workflowFilePath, 'utf8');
      if (baseUrl) {
        const workflowData = await getCodefulWorkflowData(context, fileContent, baseUrl, apiVersion);
        workflowName = workflowData.workflowName;
        workflowKind = workflowData.workflowKind;
        triggerName = workflowData.triggerName;
        hasHttpTrigger = workflowData.triggerType === 'Request' && workflowData.triggerKind === 'Http';
        if (!triggerName) {
          hasHttpTrigger = hasHttpRequestTrigger(workflowContent);
          triggerName = await getCodefulTriggerName(
            context,
            workflowName,
            workflowFilePath,
            fileContent,
            hasHttpTrigger,
            baseUrl,
            apiVersion
          );
        }
      }

      // For codeful workflows, create a minimal workflow content structure
      // The actual workflow definition is in the C# code, not in a workflow.json
      workflowContent = {
        definition: {
          $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
          contentVersion: '1.0.0.0',
          triggers: {
            [triggerName]: hasHttpTrigger
              ? {
                  type: 'Request',
                  kind: 'Http',
                  inputs: {
                    schema: {},
                  },
                }
              : {
                  type: 'Unknown',
                },
          },
          actions: {},
          outputs: {},
        },
        kind: workflowKind,
      };

      getCallbackInfo = async (baseUrl: string) =>
        await getCodefulWorkflowCallbackInfo(context, baseUrl, workflowName, triggerName, apiVersion, hasHttpTrigger);
    } else {
      // Codeless workflow
      workflowName = basename(dirname(workflowFilePath));
      workflowContent = JSON.parse(readFileSync(workflowFilePath, 'utf8'));
      triggerName = getTriggerName(workflowContent.definition);
      getCallbackInfo = async (baseUrl: string) =>
        await getLocalWorkflowCallbackInfo(context, workflowContent.definition, baseUrl, workflowName, triggerName, apiVersion);
    }

    callbackInfo = baseUrl ? await getCallbackInfo(baseUrl) : undefined;
    panelName = `${vscode.workspace.name}-${workflowName}-overview`;
    localSettings = projectPath ? (await getLocalSettingsJson(context, join(projectPath, localSettingsFileName))).Values || {} : {};
    getAccessToken = async () => await getAuthorizationToken(localSettings[workflowTenantIdKey]);
    accessToken = await getAccessToken();
    if (projectPath) {
      azureDetails = await getAzureConnectorDetailsForLocalProject(context, projectPath);
      const connectionJson = await getConnectionsJson(projectPath);
      connectionData = connectionJson ? JSON.parse(connectionJson) : {};
    }
  } else if (workflowNode instanceof RemoteWorkflowTreeItem) {
    workflowName = workflowNode.name;
    panelName = `${workflowNode.id}-${workflowName}-overview`;
    workflowContent = workflowNode.workflowFileContent;
    getAccessToken = async () => await getAuthorizationTokenFromNode(workflowNode);
    getBaseUrl = () => getWorkflowManagementBaseURI(workflowNode);
    baseUrl = getBaseUrl?.();
    apiVersion = workflowAppApiVersion;
    triggerName = getTriggerName(workflowContent.definition);
    getCallbackInfo = async (baseUrl: string) => await workflowNode.getCallbackUrl(workflowNode, baseUrl, triggerName, apiVersion);
    callbackInfo = await getCallbackInfo(baseUrl);
    corsNotice = localize('CorsNotice', 'To view runs, set "*" to allowed origins in the CORS setting.');
    isLocal = false;
    accessToken = await getAccessToken();
    azureDetails = {
      enabled: true,
      accessToken,
      subscriptionId: workflowNode?.subscription?.subscriptionId,
      location: normalizeLocation(workflowNode?.parent?.parent?.site.location),
      workflowManagementBaseUrl: workflowNode?.parent?.subscription?.environment?.resourceManagerEndpointUrl,
      tenantId: workflowNode?.parent?.subscription?.tenantId,
      resourceGroupName: workflowNode?.parent?.parent?.site.resourceGroup,
    };
    connectionData = {};
  } else {
    throw new Error(localize('noWorkflowNode', 'No workflow node provided.'));
  }

  const existingPanel: vscode.WebviewPanel | undefined = tryGetWebviewPanel(panelGroupKey, panelName);

  if (existingPanel) {
    if (!existingPanel.active) {
      existingPanel.reveal(vscode.ViewColumn.Active);
    }
    return;
  }

  const options: vscode.WebviewOptions & vscode.WebviewPanelOptions = {
    enableScripts: true,
    retainContextWhenHidden: true,
  };
  const { name, kind, operationOptions, statelessRunMode } = getStandardAppData(workflowName, workflowContent);
  const workflowProps = {
    name,
    stateType: getWorkflowStateType(name, kind, localSettings),
    operationOptions,
    statelessRunMode,
    callbackInfo,
    triggerName,
    definition: workflowContent.definition,
  };

  const panel: vscode.WebviewPanel = vscode.window.createWebviewPanel(
    'workflowOverview',
    `${workflowName}-overview`,
    vscode.ViewColumn.Active,
    options
  );

  panel.iconPath = {
    light: vscode.Uri.file(path.join(ext.context.extensionPath, assetsFolderName, 'light', 'Codeless.svg')),
    dark: vscode.Uri.file(path.join(ext.context.extensionPath, assetsFolderName, 'dark', 'Codeless.svg')),
  };

  panel.webview.html = await getWebViewHTML('vs-code-react', panel);

  let accessTokenInterval: NodeJS.Timeout;
  let baseUrlInterval: NodeJS.Timeout;
  panel.webview.onDidReceiveMessage(async (message) => {
    switch (message.command) {
      case ExtensionCommand.loadRun: {
        openMonitoringView(context, workflowNode, message.item.id, workflowFilePath);
        break;
      }
      case ExtensionCommand.initialize: {
        panel.webview.postMessage({
          command: ExtensionCommand.initialize_frame,
          data: {
            apiVersion: apiVersion,
            baseUrl: baseUrl,
            corsNotice,
            accessToken: accessToken,
            workflowProperties: workflowProps,
            project: ProjectName.overview,
            hostVersion: ext.extensionVersion,
            isLocal: isLocal,
            azureDetails: azureDetails,
            kind: kind,
            supportsUnitTest: isLocal && localSettings['WORKFLOW_CODEFUL_ENABLED'] !== 'true',
            connectionData: connectionData,
          },
        });

        // Just shipping the access Token every 5 seconds is easier and more
        // performant that asking for it every time and waiting.
        accessTokenInterval = setInterval(async () => {
          const updatedAccessToken = await getAccessToken();

          if (updatedAccessToken !== accessToken) {
            accessToken = updatedAccessToken;
            panel.webview.postMessage({
              command: ExtensionCommand.update_access_token,
              data: {
                accessToken,
              },
            });
          }
        }, 5000);

        let lastCheckedBaseUrl: string | undefined;
        let consecutiveCallbackErrors = 0;
        const MAX_CALLBACK_ERRORS = 3;

        baseUrlInterval = setInterval(async () => {
          const updatedBaseUrl = getBaseUrl();

          // Only process if baseUrl changed
          if (updatedBaseUrl !== baseUrl) {
            baseUrl = updatedBaseUrl;
            lastCheckedBaseUrl = baseUrl;
            panel.webview.postMessage({
              command: ExtensionCommand.update_runtime_base_url,
              data: {
                baseUrl,
              },
            });
            // Reset error count when baseUrl changes
            consecutiveCallbackErrors = 0;
          }

          // Only fetch callback info when baseUrl changes or we haven't fetched yet
          if (
            baseUrl &&
            (lastCheckedBaseUrl !== baseUrl || (callbackInfo === undefined && consecutiveCallbackErrors < MAX_CALLBACK_ERRORS))
          ) {
            lastCheckedBaseUrl = baseUrl;
            try {
              const updatedCallbackInfo = await getCallbackInfo(baseUrl);
              if (updatedCallbackInfo?.value !== callbackInfo?.value || updatedCallbackInfo?.basePath !== callbackInfo?.basePath) {
                callbackInfo = updatedCallbackInfo;
                panel.webview.postMessage({
                  command: ExtensionCommand.update_callback_info,
                  data: {
                    callbackInfo,
                  },
                });
              }
              // Reset error count on success
              consecutiveCallbackErrors = 0;
            } catch {
              consecutiveCallbackErrors++;
              if (consecutiveCallbackErrors >= MAX_CALLBACK_ERRORS) {
                ext.outputChannel.appendLog(
                  `Stopped fetching callback URL after ${MAX_CALLBACK_ERRORS} consecutive errors. Trigger may not exist for workflow '${workflowName}'.`
                );
              }
            }
          }
        }, 5000);

        break;
      }
      default:
        break;
    }
  }, ext.context.subscriptions);

  panel.onDidDispose(
    () => {
      removeWebviewPanelFromCache(panelGroupKey, panelName);
      clearInterval(accessTokenInterval);
      clearInterval(baseUrlInterval);
    },
    null,
    ext.context.subscriptions
  );
  cacheWebviewPanel(panelGroupKey, panelName, panel);
}

async function getLocalWorkflowCallbackInfo(
  context: IActionContext,
  definition: LogicAppsV2.WorkflowDefinition,
  baseUrl: string,
  workflowName: string,
  triggerName: string,
  apiVersion: string
): Promise<ICallbackUrlResponse | undefined> {
  const requestTriggerName = getRequestTriggerName(definition);
  if (requestTriggerName) {
    if (baseUrl) {
      try {
        const url = `${baseUrl}/workflows/${workflowName}/triggers/${requestTriggerName}/listCallbackUrl?api-version=${apiVersion}`;
        const response: string = await sendRequest(context, {
          url,
          method: HTTP_METHODS.POST,
        });
        return JSON.parse(response);
      } catch (error) {
        // API call failed, log error and return undefined
        ext.outputChannel.appendLog(
          localize(
            'callbackUrlApiFailed',
            'Failed to get callback URL for workflow "{0}": {1}',
            workflowName,
            error instanceof Error ? error.message : String(error)
          )
        );
        return undefined;
      }
    }
  } else {
    // For non-request triggers, provide the run endpoint
    const fallbackBaseUrl = baseUrl || `http://localhost:7071${managementApiPrefix}`;
    return {
      value: `${fallbackBaseUrl}/workflows/${workflowName}/triggers/${triggerName}/run?api-version=${apiVersion}`,
      method: HTTP_METHODS.POST,
    };
  }
}

async function getCodefulWorkflowCallbackInfo(
  context: IActionContext,
  baseUrl: string,
  workflowName: string,
  triggerName: string,
  apiVersion: string,
  hasRequestTrigger: boolean
): Promise<ICallbackUrlResponse | undefined> {
  // For HTTP request triggers, try to get the callback URL from the API
  if (hasRequestTrigger) {
    if (!baseUrl) {
      ext.outputChannel.appendLog(
        localize(
          'codefulCallbackUrlNoBaseUrl',
          'Cannot get callback URL for codeful workflow "{0}" with request trigger: baseUrl is not available. Make sure the workflow runtime is running.',
          workflowName
        )
      );
      return undefined;
    }

    try {
      const url = `${baseUrl}/workflows/${workflowName}/triggers/${triggerName}/listCallbackUrl?api-version=${apiVersion}`;
      const response: string = await sendRequest(context, {
        url,
        method: HTTP_METHODS.POST,
      });
      return JSON.parse(response);
    } catch (error) {
      ext.outputChannel.appendLog(
        localize(
          'codefulCallbackUrlApiFailed',
          'Failed to get callback URL for codeful workflow "{0}" trigger "{1}": {2}. Make sure the workflow is built and published.',
          workflowName,
          triggerName,
          error instanceof Error ? error.message : String(error)
        )
      );
      return undefined;
    }
  }

  // For non-request triggers, provide the run endpoint
  const fallbackBaseUrl = baseUrl || `http://localhost:7071${managementApiPrefix}`;
  return {
    value: `${fallbackBaseUrl}/workflows/${workflowName}/triggers/${triggerName}/run?api-version=${apiVersion}`,
    method: HTTP_METHODS.POST,
  };
}

function normalizeLocation(location: string): string {
  if (!location) {
    return '';
  }
  return location.toLowerCase().replace(/ /g, '');
}

function getWorkflowStateType(workflowName: string, kind: string, settings: Record<string, string>): string {
  const operationOptionsSetting = `Workflows.${workflowName}.OperationOptions`;
  const flowKindLower = kind?.toLowerCase();
  return flowKindLower === 'stateful'
    ? localize('logicapps.stateful', 'Stateful')
    : flowKindLower === 'agent'
      ? localize('logicapps.agent', 'Agent')
      : settings[operationOptionsSetting]?.toLowerCase() === 'withstatelessrunhistory'
        ? localize('logicapps.statelessDebug', 'Stateless (debug mode)')
        : localize('logicapps.stateless', 'Stateless');
}

async function getCodefulWorkflowData(
  context: IActionContext,
  workflowContent: string,
  baseUrl: string,
  apiVersion: string
): Promise<{ workflowName: string; workflowKind: string; triggerName?: string; triggerType?: string; triggerKind?: string }> {
  const workflowsUrl = `${baseUrl}/workflows?api-version=${apiVersion}`;
  const workflowsResponse = await sendRequest(context, {
    url: workflowsUrl,
    method: HTTP_METHODS.GET,
  });
  const workflows: { name: string; kind: string; triggers?: Record<string, { type?: string; kind?: string }> }[] =
    JSON.parse(workflowsResponse);
  if (!workflows || workflows.length === 0) {
    throw new Error(localize('noWorkflowsFound', 'No workflows found in the workflow runtime.'));
  }

  if (workflows.length === 1) {
    const workflow = workflows[0];
    const [triggerName, trigger] = Object.entries(workflow.triggers ?? {})[0] ?? [];
    return {
      workflowName: workflow.name,
      workflowKind: workflow.kind,
      triggerName: triggerName,
      triggerType: trigger?.type,
      triggerKind: trigger?.kind,
    };
  }

  const workflowInfo = detectCodefulWorkflow(workflowContent);
  if (!workflowInfo) {
    throw new Error(localize('noCodefulWorkflow', 'Could not detect a workflow definition in this file.'));
  }

  const exactMatchWorkflow = workflows.find((w) => w.name === workflowInfo.workflowName);
  if (exactMatchWorkflow) {
    const [triggerName, trigger] = Object.entries(exactMatchWorkflow.triggers ?? {})[0] ?? [];
    return {
      workflowName: exactMatchWorkflow.name,
      workflowKind: exactMatchWorkflow.kind,
      triggerName: triggerName,
      triggerType: trigger?.type,
      triggerKind: trigger?.kind,
    };
  }

  const pickedWorkflowName = await vscode.window.showQuickPick(
    workflows.map((w) => w.name),
    {
      placeHolder: localize('selectCodefulWorkflow', 'Select a workflow'),
      ignoreFocusOut: true,
    }
  );
  if (!pickedWorkflowName) {
    return undefined;
  }
  const pickedWorkflow = workflows.find((w) => w.name === pickedWorkflowName);
  const [triggerName, trigger] = Object.entries(pickedWorkflow?.triggers ?? {})[0] ?? [];
  return {
    workflowName: pickedWorkflowName,
    workflowKind: pickedWorkflow?.kind,
    triggerName: triggerName,
    triggerType: trigger?.type,
    triggerKind: trigger?.kind,
  };
}

async function getCodefulTriggerName(
  context: IActionContext,
  workflowName: string,
  workflowFilePath: string,
  workflowContent: string,
  hasHttpTrigger: boolean,
  baseUrl: string,
  apiVersion: string
): Promise<string | undefined> {
  const triggersUrl = `${baseUrl}/workflows/${workflowName}/triggers?api-version=${apiVersion}`;
  const response: string = await sendRequest(context, {
    url: triggersUrl,
    method: HTTP_METHODS.GET,
  });
  const triggersData = JSON.parse(response);

  if (triggersData?.value?.length > 0) {
    return triggersData.value[0].name;
  }

  const triggerNameFromWorkflow = hasHttpTrigger ? extractHttpTriggerName(workflowContent) : extractTriggerNameFromCodeful(workflowContent);
  if (triggerNameFromWorkflow) {
    return triggerNameFromWorkflow;
  }

  const lspMetadata = await getCodefulWorkflowMetadata(workflowFilePath);
  if (lspMetadata?.triggerName) {
    return lspMetadata.triggerName;
  }
}
