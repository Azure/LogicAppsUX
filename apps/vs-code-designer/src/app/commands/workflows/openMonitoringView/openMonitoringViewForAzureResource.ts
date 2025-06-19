/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import path from 'path';
import { workflowAppApiVersion } from '../../../../constants';
import { ext } from '../../../../extensionVariables';
import { localize } from '../../../../localize';
import type { RemoteWorkflowTreeItem } from '../../../tree/remoteWorkflowsTree/RemoteWorkflowTreeItem';
import {
  removeWebviewPanelFromCache,
  cacheWebviewPanel,
  getWorkflowManagementBaseURI,
  getStandardAppData,
} from '../../../utils/codeless/common';
import { sendAzureRequest } from '../../../utils/requestUtils';
import type { IAzureConnectorsContext } from '../azureConnectorWizard';
import { OpenMonitoringViewBase } from './openMonitoringViewBase';
import { getTriggerName, HTTP_METHODS } from '@microsoft/logic-apps-shared';
import { openUrl, type IActionContext } from '@microsoft/vscode-azext-utils';
import type { IDesignerPanelMetadata, IWorkflowFileContent } from '@microsoft/vscode-extension-logic-apps';
import { ExtensionCommand, ProjectName } from '@microsoft/vscode-extension-logic-apps';
import * as vscode from 'vscode';
import type { WebviewPanel } from 'vscode';
import { Uri, ViewColumn } from 'vscode';
import { getAuthorizationTokenFromNode } from '../../../utils/codeless/getAuthorizationToken';

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

    this.panel = vscode.window.createWebviewPanel(
      this.panelGroupKey, // Key used to reference the panel
      this.panelName, // Title display in the tab
      ViewColumn.Active, // Editor column to show the new webview panel in.
      this.getPanelOptions()
    );
    this.panel.iconPath = {
      light: Uri.file(path.join(ext.context.extensionPath, 'assets', 'dark', 'workflow.svg')),
      dark: Uri.file(path.join(ext.context.extensionPath, 'assets', 'light', 'workflow.svg')),
    };
    this.panelMetadata = await this.getDesignerPanelMetadata();

    this.baseUrl = getWorkflowManagementBaseURI(this.node);
    const accessToken = await this.node.subscription.credentials.getToken();

    this.panel.webview.html = await this.getWebviewContent({
      connectionsData: this.panelMetadata.connectionsData,
      parametersData: this.panelMetadata.parametersData || {},
      localSettings: this.panelMetadata.localSettings,
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
            runId: this.runId,
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
      case ExtensionCommand.logTelemetry: {
        const eventName = message.data.name ?? message.data.area;
        ext.telemetryReporter.sendTelemetryEvent(eventName, { ...message.data });
        break;
      }
      case ExtensionCommand.fileABug: {
        await openUrl('https://github.com/Azure/LogicAppsUX/issues/new?template=bug_report.yml');
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
      const url = `${this.baseUrl}/workflows/${this.workflowName}/triggers/${triggerName}/histories/${this.runId}/resubmit?api-version=${this.apiVersion}`;

      try {
        await sendAzureRequest(url, this.context, HTTP_METHODS.POST, this.node.subscription);
      } catch (error) {
        const errorMessage = localize('runResubmitFailed', 'Workflow run resubmit failed: ') + error.message;
        await vscode.window.showErrorMessage(errorMessage, localize('OK', 'OK'));
      }
    });
  }

  private async getDesignerPanelMetadata(): Promise<IDesignerPanelMetadata> {
    const accessToken: string = await getAuthorizationTokenFromNode(this.node);

    return {
      panelId: this.panelName,
      connectionsData: await this.node.getConnectionsData(),
      localSettings: await this.node.getAppSettings(),
      workflowDetails: await this.node.getChildWorkflows(this.context),
      artifacts: await this.node.getArtifacts(),
      parametersData: await this.node.getParametersData(),
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
