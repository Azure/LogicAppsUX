/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localSettingsFileName, managementApiPrefix } from '../../../../constants';
import { ext } from '../../../../extensionVariables';
import { localize } from '../../../../localize';
import { getLocalSettingsJson } from '../../../utils/appSettings/localSettings';
import {
  removeWebviewPanelFromCache,
  cacheWebviewPanel,
  getTriggerName,
  getAzureConnectorDetailsForLocalProject,
  getArtifactsInLocalProject,
  getStandardAppData,
} from '../../../utils/codeless/common';
import { getConnectionsFromFile, getLogicAppProjectRoot, getParametersFromFile } from '../../../utils/codeless/connection';
import { sendRequest } from '../../../utils/requestUtils';
import { OpenMonitoringViewBase } from './openMonitoringViewBase';
import { HTTP_METHODS } from '@microsoft/logic-apps-shared';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { AzureConnectorDetails, IDesignerPanelMetadata, Parameter } from '@microsoft/vscode-extension';
import { ExtensionCommand, ProjectName } from '@microsoft/vscode-extension';
import { promises, readFileSync } from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import type { WebviewPanel } from 'vscode';
import { ViewColumn } from 'vscode';

export default class OpenMonitoringViewForLocal extends OpenMonitoringViewBase {
  private projectPath: string | undefined;
  private panelMetadata: IDesignerPanelMetadata;

  constructor(context: IActionContext, runId: string, workflowFilePath: string) {
    const apiVersion = '2019-10-01-edge-preview';

    super(context, runId, workflowFilePath, true, apiVersion);
  }

  public async createPanel(): Promise<void> {
    const existingPanel: WebviewPanel | undefined = this.getExistingPanel();

    if (existingPanel) {
      this.panel = existingPanel;
      if (!existingPanel.active) {
        existingPanel.reveal(vscode.ViewColumn.Active);
      }

      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      this.panelGroupKey, // Key used to reference the panel
      this.panelName, // Title display in the tab
      ViewColumn.Active, // Editor column to show the new webview panel in.
      this.getPanelOptions()
    );

    this.projectPath = await getLogicAppProjectRoot(this.context, this.workflowFilePath);
    const connectionsData = await getConnectionsFromFile(this.context, this.workflowFilePath);
    const parametersData = await getParametersFromFile(this.context, this.workflowFilePath);
    this.baseUrl = `http://localhost:${ext.workflowRuntimePort}${managementApiPrefix}`;

    if (this.projectPath) {
      this.localSettings = (await getLocalSettingsJson(this.context, path.join(this.projectPath, localSettingsFileName))).Values;
    } else {
      throw new Error(localize('FunctionRootFolderError', 'Unable to determine function project root folder.'));
    }

    this.panelMetadata = await this._getDesignerPanelMetadata();
    this.panel.webview.html = await this.getWebviewContent({
      connectionsData: connectionsData,
      parametersData: parametersData,
      localSettings: this.localSettings,
      artifacts: await getArtifactsInLocalProject(this.projectPath),
      azureDetails: await getAzureConnectorDetailsForLocalProject(this.context, this.projectPath),
    });
    this.panelMetadata.mapArtifacts = this.mapArtifacts;
    this.panelMetadata.schemaArtifacts = this.schemaArtifacts;

    this.panel.webview.onDidReceiveMessage(
      async (message) => await this._handleWebviewMsg(message),
      /* thisArgs */ undefined,
      ext.context.subscriptions
    );

    this.panel.onDidDispose(
      () => {
        removeWebviewPanelFromCache(this.panelGroupKey, this.panelName);
      },
      null,
      ext.context.subscriptions
    );

    cacheWebviewPanel(this.panelGroupKey, this.panelName, this.panel);
    ext.context.subscriptions.push(this.panel);
  }

  private async _handleWebviewMsg(message: any) {
    switch (message.command) {
      case ExtensionCommand.initialize: {
        this.sendMsgToWebview({
          command: ExtensionCommand.initialize_frame,
          data: {
            project: ProjectName.designer,
            panelMetadata: this.panelMetadata,
            connectionData: this.connectionData,
            workflowDetails: this.workflowDetails,
            oauthRedirectUrl: this.oauthRedirectUrl,
            baseUrl: this.baseUrl,
            apiVersion: this.apiVersion,
            apiHubServiceDetails: this.apiHubServiceDetails,
            readOnly: this.readOnly,
            isLocal: this.isLocal,
            isMonitoringView: this.isMonitoringView,
            runId: this.runName,
            hostVersion: ext.extensionVersion,
          },
        });
        break;
      }
      case ExtensionCommand.showContent: {
        await this.openContent(message.header, message.id, message.title, message.content);
        break;
      }
      case ExtensionCommand.resubmitRun: {
        await this.resubmitRun();
        break;
      }
      default:
        break;
    }
  }

  private async resubmitRun(): Promise<void> {
    const options: vscode.ProgressOptions = {
      location: vscode.ProgressLocation.Notification,
      title: localize('runResubmit', 'Resubmitting workflow run...'),
    };

    await vscode.window.withProgress(options, async () => {
      try {
        const fileContent = await promises.readFile(this.workflowFilePath, 'utf8');
        const workflowContent: any = JSON.parse(fileContent);
        const triggerName = getTriggerName(workflowContent.definition);
        const url = `${this.baseUrl}/workflows/${this.workflowName}/triggers/${triggerName}/histories/${this.runName}/resubmit?api-version=${this.apiVersion}`;

        await sendRequest(this.context, { url, method: HTTP_METHODS.POST });
      } catch (error) {
        const errorMessage = localize('runResubmitFailed', 'Workflow run resubmit failed: ') + error.message;
        await vscode.window.showErrorMessage(errorMessage, localize('OK', 'OK'));
      }
    });
  }

  private async _getDesignerPanelMetadata(): Promise<IDesignerPanelMetadata> {
    const connectionsData: string = await getConnectionsFromFile(this.context, this.workflowFilePath);
    const projectPath: string | undefined = await getLogicAppProjectRoot(this.context, this.workflowFilePath);
    const workflowContent: any = JSON.parse(readFileSync(this.workflowFilePath, 'utf8'));
    const parametersData: Record<string, Parameter> = await getParametersFromFile(this.context, this.workflowFilePath);
    let localSettings: Record<string, string>;
    let azureDetails: AzureConnectorDetails;

    if (projectPath) {
      azureDetails = await getAzureConnectorDetailsForLocalProject(this.context, projectPath);
      localSettings = (await getLocalSettingsJson(this.context, path.join(projectPath, localSettingsFileName))).Values;
    } else {
      throw new Error(localize('FunctionRootFolderError', 'Unable to determine function project root folder.'));
    }

    return {
      panelId: this.panelName,
      appSettingNames: Object.keys(localSettings),
      connectionsData,
      localSettings,
      parametersData,
      azureDetails,
      accessToken: azureDetails.accessToken,
      workflowName: this.workflowName,
      workflowDetails: {},
      artifacts: await getArtifactsInLocalProject(projectPath),
      standardApp: getStandardAppData(this.workflowName, { ...workflowContent, definition: {} }),
      schemaArtifacts: this.schemaArtifacts,
      mapArtifacts: this.mapArtifacts,
    };
  }
}
