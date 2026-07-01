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
  workflowCodefulEnabledKey,
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
import { shouldUpdateOverviewCallbackInfo } from './overviewCallbackInfo';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { AzureConnectorDetails, ICallbackUrlResponse } from '@microsoft/vscode-extension-logic-apps';
import { ExtensionCommand, ProjectName } from '@microsoft/vscode-extension-logic-apps';
import { readFileSync, readdirSync } from 'fs';
import { basename, dirname, join } from 'path';
import * as path from 'path';
import * as vscode from 'vscode';
import { launchProjectDebugger } from '../../utils/vsCodeConfig/launch';
import { isRuntimeUp } from '../../utils/startRuntimeApi';
import { delay } from '../../utils/delay';
import { detectCodefulWorkflow, extractTriggerNameFromCodeful, extractHttpTriggerName, hasHttpRequestTrigger } from '../../utils/codeful';
import { getCodefulWorkflowMetadata } from '../../languageServer/languageServer';

interface CodefulWorkflowData {
  workflowName: string;
  workflowKind: string;
  triggerName?: string;
  triggerType?: string;
  triggerKind?: string;
}

interface CodefulWorkflowDataResult {
  workflows: CodefulWorkflowData[];
  fromRuntime: boolean;
}

interface CodefulTriggerData {
  triggerName?: string;
  triggerType?: string;
  triggerKind?: string;
}

interface CallbackInfoUpdate {
  workflowName: string;
  callbackInfo?: ICallbackUrlResponse;
}

interface OverviewWorkflowProperties {
  name: string;
  stateType: string;
  operationOptions?: string;
  statelessRunMode?: string;
  callbackInfo?: ICallbackUrlResponse;
  triggerName?: string;
  definition: LogicAppsV2.WorkflowDefinition;
  kind?: string;
}

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
  let getCallbackInfo: ((baseUrl: string) => Promise<ICallbackUrlResponse | undefined>) | undefined;
  let getCodefulCallbackInfoUpdates: ((baseUrl: string) => Promise<CallbackInfoUpdate[]>) | undefined;
  let panelName = '';
  let panelTitle = '';
  let corsNotice: string | undefined;
  let localSettings: Record<string, string> = {};
  let connectionData: Record<string, any> = {};
  let azureDetails: AzureConnectorDetails;
  let triggerName: string | undefined;
  let workflowProps: OverviewWorkflowProperties | undefined;
  let workflowPropertiesList: OverviewWorkflowProperties[] | undefined;
  let isCodefulOverview = false;
  let codefulWorkflowFileContent = '';
  let isCodefulRuntimeMetadataConfirmed = false;
  let workflowPropertiesListSignature = '';
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

    localSettings = projectPath ? (await getLocalSettingsJson(context, join(projectPath, localSettingsFileName))).Values || {} : {};

    if (workflowFilePath.endsWith('.cs')) {
      isCodefulOverview = true;
      const fileContent = readFileSync(workflowFilePath, 'utf8');
      codefulWorkflowFileContent = fileContent;
      const codefulWorkflowData = await getCodefulWorkflowDataList(context, workflowFilePath, fileContent, baseUrl, apiVersion);
      const codefulWorkflows = codefulWorkflowData.workflows;
      isCodefulRuntimeMetadataConfirmed = codefulWorkflowData.fromRuntime;
      if (codefulWorkflows.length === 0) {
        throw new Error(localize('noCodefulWorkflowsFound', 'No codeful workflows were found in this project.'));
      }

      workflowPropertiesList = await createCodefulWorkflowPropertiesList(
        context,
        codefulWorkflows,
        workflowFilePath,
        fileContent,
        baseUrl,
        apiVersion,
        localSettings
      );
      workflowPropertiesListSignature = getWorkflowPropertiesListSignature(workflowPropertiesList);

      workflowProps = workflowPropertiesList[0];
      workflowName = workflowProps.name;
      triggerName = workflowProps.triggerName;
      callbackInfo = workflowProps.callbackInfo;
      workflowContent = createCodefulWorkflowContent(
        {
          workflowName: workflowProps.name,
          workflowKind: workflowProps.kind ?? 'Stateful',
          triggerName: workflowProps.triggerName,
        },
        workflowProps.triggerName,
        getCodefulWorkflowHasHttpTrigger(workflowProps)
      );
      getCodefulCallbackInfoUpdates = async (baseUrl: string) =>
        await Promise.all(
          (workflowPropertiesList ?? []).map(async (workflow) => ({
            workflowName: workflow.name,
            callbackInfo: workflow.triggerName
              ? await getCodefulWorkflowCallbackInfo(
                  context,
                  baseUrl,
                  workflow.name,
                  workflow.triggerName,
                  apiVersion,
                  getCodefulWorkflowHasHttpTrigger(workflow)
                )
              : undefined,
          }))
        );
    } else {
      // Codeless workflow
      workflowName = basename(dirname(workflowFilePath));
      workflowContent = JSON.parse(readFileSync(workflowFilePath, 'utf8'));
      triggerName = getTriggerName(workflowContent.definition);
      getCallbackInfo = async (baseUrl: string) =>
        await getLocalWorkflowCallbackInfo(context, workflowContent.definition, baseUrl, workflowName, triggerName, apiVersion);
      callbackInfo = baseUrl ? await getCallbackInfo(baseUrl) : undefined;
    }

    const projectName = projectPath ? basename(projectPath) : basename(dirname(workflowFilePath));
    panelName = isCodefulOverview
      ? `${vscode.workspace.name}-${projectName}-codeful-overview`
      : `${vscode.workspace.name}-${workflowName}-overview`;
    panelTitle = isCodefulOverview ? `${projectName}-overview` : `${workflowName}-overview`;
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
    panelTitle = `${workflowName}-overview`;
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
  workflowProps ??= {
    name,
    stateType: getWorkflowStateType(name, kind, localSettings),
    operationOptions,
    statelessRunMode,
    callbackInfo,
    triggerName,
    definition: workflowContent.definition,
    kind,
  };

  const panel: vscode.WebviewPanel = vscode.window.createWebviewPanel(
    'workflowOverview',
    panelTitle || `${workflowName}-overview`,
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
            workflowPropertiesList,
            project: ProjectName.overview,
            hostVersion: ext.extensionVersion,
            isLocal: isLocal,
            azureDetails: azureDetails,
            kind: workflowProps.kind ?? kind,
            isCodeful: isCodefulOverview,
            supportsUnitTest: isLocal && localSettings[workflowCodefulEnabledKey] !== 'true',
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

          if (isCodefulOverview && baseUrl && !isCodefulRuntimeMetadataConfirmed) {
            const runtimeWorkflows = await getRuntimeCodefulWorkflows(context, baseUrl, apiVersion);
            if (runtimeWorkflows.length > 0) {
              const refreshedWorkflowPropertiesList = await createCodefulWorkflowPropertiesList(
                context,
                runtimeWorkflows,
                workflowFilePath,
                codefulWorkflowFileContent,
                baseUrl,
                apiVersion,
                localSettings
              );
              const refreshedSignature = getWorkflowPropertiesListSignature(refreshedWorkflowPropertiesList);
              isCodefulRuntimeMetadataConfirmed = true;

              if (refreshedSignature !== workflowPropertiesListSignature) {
                workflowPropertiesList = refreshedWorkflowPropertiesList;
                workflowProps = workflowPropertiesList[0];
                workflowName = workflowProps.name;
                triggerName = workflowProps.triggerName;
                callbackInfo = workflowProps.callbackInfo;
                workflowContent = createCodefulWorkflowContent(
                  {
                    workflowName: workflowProps.name,
                    workflowKind: workflowProps.kind ?? 'Stateful',
                    triggerName: workflowProps.triggerName,
                  },
                  workflowProps.triggerName,
                  getCodefulWorkflowHasHttpTrigger(workflowProps)
                );
                workflowPropertiesListSignature = refreshedSignature;
                panel.webview.postMessage({
                  command: ExtensionCommand.update_workflow_properties,
                  data: {
                    workflowProperties: workflowProps,
                    workflowPropertiesList,
                    kind: workflowProps.kind,
                  },
                });
              }
            }
          }

          // Only fetch callback info when baseUrl changes or we haven't fetched yet
          if (
            baseUrl &&
            (lastCheckedBaseUrl !== baseUrl || (callbackInfo === undefined && consecutiveCallbackErrors < MAX_CALLBACK_ERRORS))
          ) {
            lastCheckedBaseUrl = baseUrl;
            try {
              if (isCodefulOverview && getCodefulCallbackInfoUpdates) {
                const callbackInfoUpdates = await getCodefulCallbackInfoUpdates(baseUrl);
                for (const update of callbackInfoUpdates) {
                  const workflowProperty = workflowPropertiesList?.find((workflow) => workflow.name === update.workflowName);
                  if (
                    update.callbackInfo?.value !== workflowProperty?.callbackInfo?.value ||
                    update.callbackInfo?.basePath !== workflowProperty?.callbackInfo?.basePath
                  ) {
                    if (workflowProperty) {
                      workflowProperty.callbackInfo = update.callbackInfo;
                    }
                    panel.webview.postMessage({
                      command: ExtensionCommand.update_callback_info,
                      data: {
                        workflowName: update.workflowName,
                        callbackInfo: update.callbackInfo,
                      },
                    });
                  }
                }
                callbackInfo = workflowPropertiesList?.[0]?.callbackInfo;
              } else if (getCallbackInfo) {
                const updatedCallbackInfo = await getCallbackInfo(baseUrl);
                if (shouldUpdateOverviewCallbackInfo(callbackInfo, updatedCallbackInfo)) {
                  callbackInfo = updatedCallbackInfo;
                  panel.webview.postMessage({
                    command: ExtensionCommand.update_callback_info,
                    data: {
                      callbackInfo,
                    },
                  });
                }
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

    const url = `${baseUrl}/workflows/${workflowName}/triggers/${triggerName}/listCallbackUrl?api-version=${apiVersion}`;
    try {
      const response: string = await sendRequest(context, {
        url,
        method: HTTP_METHODS.POST,
      });
      return JSON.parse(response);
    } catch (error) {
      ext.outputChannel.appendLog(
        localize(
          'codefulCallbackUrlApiFailed',
          'Falling back to CodefulWorkflowHttpTrigger URL for codeful workflow "{0}" trigger "{1}" (listCallbackUrl failed: {2}).',
          workflowName,
          triggerName,
          error instanceof Error ? error.message : String(error)
        )
      );
      // Fall back to the CodefulWorkflowHttpTrigger endpoint pattern
      return getCodefulHttpTriggerCallbackUrl(baseUrl, workflowName, triggerName);
    }
  }

  // For non-request triggers, provide the run endpoint
  const fallbackBaseUrl = baseUrl || `http://localhost:7071${managementApiPrefix}`;
  return {
    value: `${fallbackBaseUrl}/workflows/${workflowName}/triggers/${triggerName}/run?api-version=${apiVersion}`,
    method: HTTP_METHODS.POST,
  };
}

/**
 * Constructs a callback URL using the CodefulWorkflowHttpTrigger endpoint pattern.
 * This is used as a fallback when the listCallbackUrl management API is not available.
 */
function getCodefulHttpTriggerCallbackUrl(baseUrl: string, workflowName: string, triggerName: string): ICallbackUrlResponse {
  // Extract the origin (e.g., http://localhost:7071) from the management base URL
  const origin = baseUrl.split(managementApiPrefix)[0] || baseUrl.replace(/\/runtime\/webhooks\/workflow\/api\/management$/, '');
  return {
    value: `${origin}/api/CodefulWorkflowHttpTrigger/scaleUnits/prod-00/workflows/${workflowName}/triggers/${triggerName}/invoke`,
    method: HTTP_METHODS.POST,
  };
}

async function createCodefulWorkflowPropertiesList(
  context: IActionContext,
  codefulWorkflows: CodefulWorkflowData[],
  workflowFilePath: string,
  workflowContent: string,
  baseUrl: string | undefined,
  apiVersion: string,
  localSettings: Record<string, string>
): Promise<OverviewWorkflowProperties[]> {
  return await Promise.all(
    codefulWorkflows.map(async (workflowData) => {
      const triggerData =
        baseUrl && (!workflowData.triggerName || !workflowData.triggerType)
          ? await getCodefulTriggerData(context, workflowData.workflowName, baseUrl, apiVersion).catch(() => undefined)
          : undefined;
      const resolvedWorkflowData: CodefulWorkflowData = {
        ...workflowData,
        triggerName: workflowData.triggerName ?? triggerData?.triggerName,
        triggerType: workflowData.triggerType ?? triggerData?.triggerType,
        triggerKind: workflowData.triggerKind ?? triggerData?.triggerKind,
      };
      const hasHttpTrigger = isHttpRequestTrigger(resolvedWorkflowData, workflowContent);
      // Priority: runtime trigger data → LSP server → source-code regex fallback
      const workflowTriggerName =
        resolvedWorkflowData.triggerName ??
        (await getCodefulWorkflowMetadata(workflowFilePath)
          .then((metadata) => metadata?.triggerName)
          .catch(() => undefined)) ??
        getFallbackCodefulTriggerName(workflowContent, hasHttpTrigger);
      const codefulWorkflowContent = createCodefulWorkflowContent(resolvedWorkflowData, workflowTriggerName, hasHttpTrigger);
      const codefulCallbackInfo =
        baseUrl && workflowTriggerName
          ? await getCodefulWorkflowCallbackInfo(
              context,
              baseUrl,
              resolvedWorkflowData.workflowName,
              workflowTriggerName,
              apiVersion,
              hasHttpTrigger
            )
          : undefined;

      return createWorkflowProperties(
        resolvedWorkflowData.workflowName,
        codefulWorkflowContent,
        localSettings,
        codefulCallbackInfo,
        workflowTriggerName
      );
    })
  );
}

async function getCodefulWorkflowDataList(
  context: IActionContext,
  workflowFilePath: string,
  workflowContent: string,
  baseUrl: string | undefined,
  apiVersion: string
): Promise<CodefulWorkflowDataResult> {
  if (baseUrl) {
    const runtimeWorkflows = await getRuntimeCodefulWorkflows(context, baseUrl, apiVersion);
    if (runtimeWorkflows.length > 0) {
      return {
        workflows: runtimeWorkflows,
        fromRuntime: true,
      };
    }
  }

  const hasHttpTrigger = hasHttpRequestTrigger(workflowContent);
  const fallbackTriggerName = getFallbackCodefulTriggerName(workflowContent, hasHttpTrigger);
  const workflowNames = getCodefulWorkflowNames(workflowFilePath);
  if (workflowNames.length > 0) {
    return {
      workflows: workflowNames.map((workflowName) => ({
        workflowName,
        workflowKind: 'Stateful',
        triggerName: fallbackTriggerName,
        triggerType: hasHttpTrigger ? 'Request' : undefined,
        triggerKind: hasHttpTrigger ? 'Http' : undefined,
      })),
      fromRuntime: false,
    };
  }

  const workflowInfo = detectCodefulWorkflow(workflowContent);
  return {
    workflows: workflowInfo
      ? [
          {
            workflowName: workflowInfo.workflowName,
            workflowKind: workflowInfo.workflowType === 'agent' ? 'Agent' : 'Stateful',
            triggerName: fallbackTriggerName,
            triggerType: hasHttpTrigger ? 'Request' : undefined,
            triggerKind: hasHttpTrigger ? 'Http' : undefined,
          },
        ]
      : [],
    fromRuntime: false,
  };
}

async function getRuntimeCodefulWorkflows(context: IActionContext, baseUrl: string, apiVersion: string): Promise<CodefulWorkflowData[]> {
  const workflowsUrl = `${baseUrl}/workflows?api-version=${apiVersion}`;
  const maxRetries = 4;
  const initialDelayMs = 1000;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const workflowsResponse = await sendRequest(context, {
        url: workflowsUrl,
        method: HTTP_METHODS.GET,
      });
      const parsed = JSON.parse(workflowsResponse);
      const workflows: {
        name: string;
        kind?: string;
        triggers?: Record<string, { type?: string; kind?: string; properties?: { type?: string; kind?: string } }>;
      }[] = Array.isArray(parsed) ? parsed : (parsed?.value ?? []);

      if (workflows.length > 0) {
        return workflows.map((workflow) => {
          const [runtimeTriggerName, trigger] = Object.entries(workflow.triggers ?? {})[0] ?? [];
          return {
            workflowName: workflow.name,
            workflowKind: workflow.kind ?? 'Stateful',
            triggerName: runtimeTriggerName,
            triggerType: trigger?.properties?.type ?? trigger?.type,
            triggerKind: trigger?.properties?.kind ?? trigger?.kind,
          };
        });
      }
    } catch (error) {
      if (attempt === maxRetries - 1) {
        ext.outputChannel.appendLog(
          localize(
            'codefulWorkflowListApiFailed',
            'Failed to get codeful workflows from the runtime at "{0}": {1}',
            workflowsUrl,
            error instanceof Error ? error.message : String(error)
          )
        );
      }
    }

    if (attempt < maxRetries - 1) {
      await delay(initialDelayMs * 2 ** attempt);
    }
  }

  return [];
}

function getCodefulWorkflowNames(filePath: string): string[] {
  const workflowNames: string[] = [];
  const visitedFiles = new Set<string>();
  const projectDir = dirname(filePath);

  const extractWorkflowsFromFile = (currentFilePath: string): void => {
    if (visitedFiles.has(currentFilePath)) {
      return;
    }
    visitedFiles.add(currentFilePath);

    try {
      const fileContent = readFileSync(currentFilePath, 'utf8');
      const workflowRegex = /(?:CreateConversationalAgent|CreateAgentWorkflow|CreateStatefulWorkflow)\s*\(\s*["']([^"']+)["']/g;
      let match: RegExpExecArray | null;
      while ((match = workflowRegex.exec(fileContent)) !== null) {
        const workflowName = match[1];
        if (workflowName && !workflowNames.includes(workflowName)) {
          workflowNames.push(workflowName);
        }
      }

      const files = readdirSync(projectDir);
      for (const file of files) {
        if (file.endsWith('.cs') && file !== basename(currentFilePath)) {
          extractWorkflowsFromFile(join(projectDir, file));
        }
      }
    } catch (error) {
      ext.outputChannel.appendLog(
        localize(
          'codefulWorkflowNameParseFailed',
          'Failed to parse codeful workflow names from "{0}": {1}',
          currentFilePath,
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  };

  extractWorkflowsFromFile(filePath);
  return workflowNames;
}

function getFallbackCodefulTriggerName(workflowContent: string, hasHttpTrigger: boolean): string | undefined {
  return hasHttpTrigger ? extractHttpTriggerName(workflowContent) : extractTriggerNameFromCodeful(workflowContent);
}

function isHttpRequestTrigger(workflowData: CodefulWorkflowData, workflowContent?: string): boolean {
  const triggerType = workflowData.triggerType?.toLowerCase();
  const triggerKind = workflowData.triggerKind?.toLowerCase();
  if (triggerType === 'request') {
    return !triggerKind || triggerKind === 'http';
  }

  if (triggerKind === 'http') {
    return true;
  }

  return workflowContent ? hasHttpRequestTrigger(workflowContent) : false;
}

function getCodefulWorkflowHasHttpTrigger(workflowProperties: OverviewWorkflowProperties): boolean {
  const trigger = workflowProperties.triggerName ? workflowProperties.definition?.triggers?.[workflowProperties.triggerName] : undefined;
  return trigger?.type?.toLowerCase() === 'request' && trigger?.kind?.toLowerCase() === 'http';
}

function createCodefulWorkflowContent(workflowData: CodefulWorkflowData, triggerName: string | undefined, hasHttpTrigger: boolean): any {
  return {
    definition: {
      $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
      contentVersion: '1.0.0.0',
      triggers: triggerName
        ? {
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
          }
        : {},
      actions: {},
      outputs: {},
    },
    kind: workflowData.workflowKind ?? 'Stateful',
  };
}

function createWorkflowProperties(
  workflowName: string,
  workflowContent: any,
  localSettings: Record<string, string>,
  callbackInfo: ICallbackUrlResponse | undefined,
  triggerName: string | undefined
): OverviewWorkflowProperties {
  const { name, kind, operationOptions, statelessRunMode } = getStandardAppData(workflowName, workflowContent);
  return {
    name,
    stateType: getWorkflowStateType(name, kind, localSettings),
    operationOptions,
    statelessRunMode,
    callbackInfo,
    triggerName,
    definition: workflowContent.definition,
    kind,
  };
}

function getWorkflowPropertiesListSignature(workflowPropertiesList: OverviewWorkflowProperties[] | undefined): string {
  return JSON.stringify(
    (workflowPropertiesList ?? []).map((workflowProperties) => ({
      name: workflowProperties.name,
      kind: workflowProperties.kind,
      triggerName: workflowProperties.triggerName,
      callbackUrl: workflowProperties.callbackInfo?.value,
    }))
  );
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

async function getCodefulTriggerData(
  context: IActionContext,
  workflowName: string,
  baseUrl: string,
  apiVersion: string
): Promise<CodefulTriggerData | undefined> {
  const triggersUrl = `${baseUrl}/workflows/${workflowName}/triggers?api-version=${apiVersion}`;
  const response: string = await sendRequest(context, {
    url: triggersUrl,
    method: HTTP_METHODS.GET,
  });
  const triggersData = JSON.parse(response);

  if (triggersData?.value?.length > 0) {
    const trigger = triggersData.value[0];
    return {
      triggerName: trigger.name,
      triggerType: trigger.properties?.type ?? trigger.type,
      triggerKind: trigger.properties?.kind ?? trigger.kind,
    };
  }
}
