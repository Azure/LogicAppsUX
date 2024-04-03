/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isNullOrUndefined } from '@microsoft/utils-logic-apps';
import { localSettingsFileName, managementApiPrefix, workflowAppApiVersion } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { RemoteWorkflowTreeItem } from '../../tree/remoteWorkflowsTree/RemoteWorkflowTreeItem';
import { getLocalSettingsJson } from '../../utils/appSettings/localSettings';
import {
  cacheWebviewPanel,
  getStandardAppData,
  getWorkflowManagementBaseURI,
  removeWebviewPanelFromCache,
  tryGetWebviewPanel,
} from '../../utils/codeless/common';
import { getLogicAppProjectRoot } from '../../utils/codeless/connection';
import { getAuthorizationToken } from '../../utils/codeless/getAuthorizationToken';
import { getWebViewHTML } from '../../utils/codeless/getWebViewHTML';
import { sendRequest } from '../../utils/requestUtils';
import { getWorkflowNode } from '../../utils/workspace';
import type { IAzureConnectorsContext } from './azureConnectorWizard';
import { openMonitoringView } from './openMonitoringView/openMonitoringView';
import type { ServiceClientCredentials } from '@azure/ms-rest-js';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { ICallbackUrlResponse } from '@microsoft/vscode-extension';
import { ExtensionCommand, ProjectName } from '@microsoft/vscode-extension';
import { readFileSync } from 'fs';
import { basename, dirname, join } from 'path';
import * as path from 'path';
import * as vscode from 'vscode';

export async function openOverview(context: IAzureConnectorsContext, node: vscode.Uri | RemoteWorkflowTreeItem | undefined): Promise<void> {
  let workflowFilePath: string;
  let workflowName = '';
  let workflowContent: any;
  let baseUrl: string;
  let apiVersion: string;
  let accessToken: string;
  let callbackInfo: ICallbackUrlResponse | undefined;
  let panelName = '';
  let corsNotice: string | undefined;
  let localSettings: Record<string, string> = {};
  let credentials: ServiceClientCredentials;
  let isWorkflowRuntimeRunning;
  const workflowNode = getWorkflowNode(node);
  const panelGroupKey = ext.webViewKey.overview;

  if (workflowNode instanceof vscode.Uri) {
    workflowFilePath = workflowNode.fsPath;
    workflowName = basename(dirname(workflowFilePath));
    panelName = `${vscode.workspace.name}-${workflowName}-overview`;
    workflowContent = JSON.parse(readFileSync(workflowFilePath, 'utf8'));
    baseUrl = `http://localhost:${ext.workflowRuntimePort}${managementApiPrefix}`;
    apiVersion = '2019-10-01-edge-preview';
    accessToken = '';
    const triggerName = getRequestTriggerName(workflowContent.definition);
    callbackInfo = await getLocalWorkflowCallbackInfo(
      context,
      `${baseUrl}/workflows/${workflowName}/triggers/${triggerName}/listCallbackUrl?api-version=${apiVersion}`
    );

    const projectPath = await getLogicAppProjectRoot(context, workflowFilePath);
    localSettings = projectPath ? (await getLocalSettingsJson(context, join(projectPath, localSettingsFileName))).Values || {} : {};
    isWorkflowRuntimeRunning = !isNullOrUndefined(ext.workflowRuntimePort);
  } else if (workflowNode instanceof RemoteWorkflowTreeItem) {
    workflowName = workflowNode.name;
    panelName = `${workflowNode.id}-${workflowName}-overview`;
    workflowContent = workflowNode.workflowFileContent;
    credentials = workflowNode.credentials;
    accessToken = await getAuthorizationToken(credentials);
    baseUrl = getWorkflowManagementBaseURI(workflowNode);
    apiVersion = workflowAppApiVersion;
    callbackInfo = await workflowNode.getCallbackUrl(workflowNode, getRequestTriggerName(workflowContent.definition));
    corsNotice = localize('CorsNotice', 'To view runs, set "*" to allowed origins in the CORS setting.');
    isWorkflowRuntimeRunning = true;
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
  };

  const panel: vscode.WebviewPanel = vscode.window.createWebviewPanel(
    'workflowOverview',
    `${workflowName}-overview`,
    vscode.ViewColumn.Active,
    options
  );

  panel.iconPath = {
    light: vscode.Uri.file(path.join(ext.context.extensionPath, 'assets', 'light', 'Codeless.svg')),
    dark: vscode.Uri.file(path.join(ext.context.extensionPath, 'assets', 'dark', 'Codeless.svg')),
  };

  panel.webview.html = await getWebViewHTML('vs-code-react', panel);

  let interval;
  panel.webview.onDidReceiveMessage(async (message) => {
    switch (message.command) {
      case ExtensionCommand.loadRun:
        openMonitoringView(context, workflowNode, message.item.id, workflowFilePath);
        break;
      case ExtensionCommand.initialize:
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
            isWorkflowRuntimeRunning: isWorkflowRuntimeRunning,
          },
        });
        // Just shipping the access Token every 5 seconds is easier and more
        // performant that asking for it every time and waiting.
        interval = setInterval(async () => {
          const updatedAccessToken = await getAuthorizationToken(credentials);

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
        break;
      default:
        break;
    }
  }, ext.context.subscriptions);

  panel.onDidDispose(
    () => {
      removeWebviewPanelFromCache(panelGroupKey, panelName);
      clearInterval(interval);
    },
    null,
    ext.context.subscriptions
  );
  cacheWebviewPanel(panelGroupKey, panelName, panel);
}

function getRequestTriggerName(definition: any): string | undefined {
  const { triggers } = definition;
  for (const triggerName of Object.keys(triggers)) {
    if (triggers[triggerName].type.toLowerCase() === 'request') {
      return triggerName;
    }
  }

  return undefined;
}

async function getLocalWorkflowCallbackInfo(context: IActionContext, url: string): Promise<ICallbackUrlResponse | undefined> {
  try {
    const response: string = await sendRequest(context, {
      url,
      method: 'POST',
    });
    return JSON.parse(response);
  } catch (error) {
    return undefined;
  }
}

function getWorkflowStateType(workflowName: string, kind: string, settings: Record<string, string>): string {
  const settingName = `Workflows.${workflowName}.OperationOptions`;
  return kind?.toLowerCase() === 'stateful'
    ? localize('logicapps.stateful', 'Stateful')
    : settings[settingName]?.toLowerCase() === 'withstatelessrunhistory'
      ? localize('logicapps.statelessDebug', 'Stateless (debug mode)')
      : localize('logicapps.stateless', 'Stateless');
}
