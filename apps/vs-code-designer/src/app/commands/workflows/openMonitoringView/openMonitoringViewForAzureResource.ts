/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { workflowAppApiVersion } from '../../../../constants';
import { ext } from '../../../../extensionVariables';
import { localize } from '../../../../localize';
import type { RemoteWorkflowTreeItem } from '../../../tree/remoteWorkflowsTree/RemoteWorkflowTreeItem';
import {
  removeWebviewPanelFromCache,
  cacheWebviewPanel,
  getTriggerName,
  getWorkflowManagementBaseURI,
  getStandardAppData,
} from '../../../utils/codeless/common';
import { getAuthorizationToken } from '../../../utils/codeless/getAuthorizationToken';
import { sendAzureRequest } from '../../../utils/requestUtils';
import type { IAzureConnectorsContext } from '../azureConnectorWizard';
import { OpenMonitoringViewBase } from './openMonitoringViewBase';
import type { ServiceClientCredentials } from '@azure/ms-rest-js';
import { HTTP_METHODS } from '@microsoft/utils-logic-apps';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { IDesignerPanelMetadata, IWorkflowFileContent } from '@microsoft/vscode-extension';
import { ExtensionCommand, ProjectName } from '@microsoft/vscode-extension';
import * as vscode from 'vscode';
import type { WebviewPanel } from 'vscode';
import { ViewColumn } from 'vscode';

export default class openMonitoringViewForAzureResource extends OpenMonitoringViewBase {
  private node: RemoteWorkflowTreeItem;
  private panelMetadata: IDesignerPanelMetadata;
  private readonly workflow: IWorkflowFileContent;

  constructor(context: IAzureConnectorsContext | IActionContext, runId: string, workflowFilePath: string, node: RemoteWorkflowTreeItem) {
    super(context, runId, workflowFilePath, false, workflowAppApiVersion);

    this.node = node;
    this.workflow = node.workflowFileContent;
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

    vscode.window.showInformationMessage(localize('logicApps.designer', 'Starting workflow designer. It might take a few seconds.'), 'OK');
    this.panel = vscode.window.createWebviewPanel(
      this.panelGroupKey, // Key used to reference the panel
      this.panelName, // Title display in the tab
      ViewColumn.Active, // Editor column to show the new webview panel in.
      this.getPanelOptions()
    );
    this.panelMetadata = await this.getDesignerPanelMetadata();

    this.baseUrl = getWorkflowManagementBaseURI(this.node);
    const accessToken = await getAuthorizationToken(this.node.credentials);
    const connectionsData: string = await this.node.getConnectionsData();
    const parametersData = await this.node.getParametersData();

    this.panel.webview.html = await this.getWebviewContent({
      connectionsData: connectionsData,
      parametersData: parametersData,
      localSettings: {},
      azureDetails: {
        enabled: true,
        accessToken,
        subscriptionId: this.node.subscription.subscriptionId,
        resourceGroupName: this.node?.parent?.parent?.site.resourceGroup,
        location: this.normalizeLocation(this.node?.parent?.parent?.site.location),
        workflowManagementBaseUrl: this.node?.parent?.subscription?.environment?.resourceManagerEndpointUrl,
      },
      artifacts: await this.node.getArtifacts(),
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
      const triggerName = getTriggerName(this.node.workflowFileContent.definition);
      const url = `${this.baseUrl}/workflows/${this.workflowName}/triggers/${triggerName}/histories/${this.runName}/resubmit?api-version=${this.apiVersion}`;

      try {
        await sendAzureRequest(url, this.context, HTTP_METHODS.POST, this.node.subscription);
      } catch (error) {
        const errorMessage = localize('runResubmitFailed', 'Workflow run resubmit failed: ') + error.message;
        await vscode.window.showErrorMessage(errorMessage, localize('OK', 'OK'));
      }
    });
  }

  private async getDesignerPanelMetadata(): Promise<IDesignerPanelMetadata> {
    const credentials: ServiceClientCredentials = this.node.credentials;
    const accessToken: string = await getAuthorizationToken(credentials);
    const parameters = await this.node.getParametersData();

    return {
      panelId: this.panelName,
      connectionsData: await this.node.getConnectionsData(),
      localSettings: await this.node.getAppSettings(),
      workflowDetails: await this.node.getChildWorkflows(this.context),
      artifacts: await this.node.getArtifacts(),
      parametersData: parameters,
      accessToken,
      azureDetails: {
        enabled: true,
        accessToken,
        subscriptionId: this.node.subscription.subscriptionId,
        location: this.normalizeLocation(this.node?.parent?.parent?.site.location),
        workflowManagementBaseUrl: this.node?.parent?.subscription?.environment?.resourceManagerEndpointUrl,
        tenantId: this.node?.parent?.subscription?.tenantId,
      },
      workflowName: this.workflowName,
      standardApp: getStandardAppData(this.workflowName, { ...this.workflow, definition: {} }),
      schemaArtifacts: this.schemaArtifacts,
      mapArtifacts: this.mapArtifacts,
    };
  }
}
