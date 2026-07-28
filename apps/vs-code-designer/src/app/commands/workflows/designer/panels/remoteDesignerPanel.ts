import { type IActionContext, openUrl } from '@microsoft/vscode-azext-utils';
import { assetsFolderName, workflowAppApiVersion } from '../../../../../constants';
import { ext } from '../../../../../extensionVariables';
import type { RemoteWorkflowTreeItem } from '../../../../tree/remoteWorkflowsTree/RemoteWorkflowTreeItem';
import {
  removeWebviewPanelFromCache,
  cacheWebviewPanel,
  getStandardAppData,
  getWorkflowManagementBaseURI,
} from '../../../../utils/codeless/common';
import { DesignerPanel } from './designerPanel';
import type { IWorkflowFileContent, DesignerPanelMetadata, FileDetails } from '@microsoft/vscode-extension-logic-apps';
import { ExtensionCommand, ProjectName } from '@microsoft/vscode-extension-logic-apps';
import * as path from 'path';
import * as vscode from 'vscode';
import { Uri } from 'vscode';
import { getAuthorizationTokenFromNode } from '../../../../utils/codeless/getAuthorizationToken';

export class RemoteDesignerPanel extends DesignerPanel {
  private readonly node: RemoteWorkflowTreeItem;
  private readonly workflow: IWorkflowFileContent;
  private panelMetadata?: DesignerPanelMetadata;

  constructor(context: IActionContext, node: RemoteWorkflowTreeItem) {
    const workflowName: string = node.name;
    const panelName = `${vscode.workspace.name}-${workflowName}`;
    const panelGroupKey = ext.webViewKey.designerAzure;

    super(context, workflowName, panelName, workflowAppApiVersion, panelGroupKey, true, false, false, '');

    this.node = node;
    this.workflow = node.workflowFileContent;
    this.baseUrl = getWorkflowManagementBaseURI(node);
  }

  public async create(): Promise<void> {
    const existingPanel: vscode.WebviewPanel | undefined = this.getExistingPanel();

    if (existingPanel) {
      this.panel = existingPanel;
      if (!existingPanel.active) {
        existingPanel.reveal(vscode.ViewColumn.Active);
      }
      return;
    }

    this.panel = vscode.window.createWebviewPanel(this.panelGroupKey, this.workflowName, vscode.ViewColumn.Active, this.getPanelOptions());
    this.panel.iconPath = {
      light: Uri.file(path.join(ext.context.extensionPath, assetsFolderName, 'dark', 'workflow.svg')),
      dark: Uri.file(path.join(ext.context.extensionPath, assetsFolderName, 'light', 'workflow.svg')),
    };
    this.panelMetadata = await this.getDesignerPanelMetadata();

    this.panel.webview.html = await this.getWebviewContent({
      connectionsData: this.panelMetadata.connectionsData,
      parametersData: this.panelMetadata.parametersData || {},
      localSettings: this.panelMetadata.localSettings,
      artifacts: this.panelMetadata.artifacts,
      azureDetails: this.panelMetadata.azureDetails,
      workflowDetails: this.panelMetadata.workflowDetails,
    });

    this.panelMetadata.mapArtifacts = this.mapArtifacts as Record<string, FileDetails[]>;
    this.panelMetadata.schemaArtifacts = this.schemaArtifacts as FileDetails[];

    this.panel.webview.onDidReceiveMessage(async (message) => await this.handleWebviewMsg(message), ext.context.subscriptions);

    this.panel.onDidDispose(
      () => {
        removeWebviewPanelFromCache(this.panelGroupKey, this.panelName);
      },
      null,
      ext.context.subscriptions
    );

    cacheWebviewPanel(this.panelGroupKey, this.panelName, this.panel);
    ext.context.subscriptions.push(this.panel);

    this.showDesignerVersionNotification();
  }

  private async handleWebviewMsg(msg: any) {
    switch (msg.command) {
      case ExtensionCommand.initialize: {
        this.panel?.webview.postMessage({
          command: ExtensionCommand.initialize_frame,
          data: {
            project: ProjectName.designer,
            panelMetadata: this.panelMetadata,
            connectionData: this.connectionData,
            baseUrl: this.baseUrl,
            apiVersion: this.apiVersion,
            apiHubServiceDetails: this.apiHubServiceDetails,
            readOnly: this.readOnly,
            isLocal: this.isLocal,
            isMonitoringView: this.isMonitoringView,
            hostVersion: ext.extensionVersion,
          },
        });
        break;
      }
      case ExtensionCommand.logTelemetry: {
        const eventName = msg.data.name ?? msg.data.area;
        ext.telemetryReporter.sendTelemetryEvent(eventName, { ...msg.data });
        break;
      }
      case ExtensionCommand.fileABug: {
        await openUrl('https://github.com/Azure/LogicAppsUX/issues/new?template=bug_report.yml');
        break;
      }
      case ExtensionCommand.getDesignerVersion: {
        this.panel?.webview.postMessage({
          command: ExtensionCommand.getDesignerVersion,
          data: this.getDesignerVersion(),
        });
        break;
      }
      default:
        break;
    }
  }

  private async getDesignerPanelMetadata(): Promise<DesignerPanelMetadata> {
    const accessToken = await getAuthorizationTokenFromNode(this.node);

    return {
      panelId: this.panelName,
      connectionsData: await this.node.getConnectionsData(),
      parametersData: await this.node.getParametersData(),
      localSettings: await this.node.getAppSettings(),
      artifacts: await this.node.getArtifacts(),
      workflowDetails: await this.node.getChildWorkflows(this.context),
      accessToken,
      azureDetails: {
        enabled: true,
        accessToken,
        subscriptionId: this.node.subscription.subscriptionId,
        location: this.normalizeLocation(this.node?.parent?.parent?.site.location),
        workflowManagementBaseUrl: this.node?.parent?.subscription?.environment?.resourceManagerEndpointUrl,
        tenantId: this.node?.parent?.subscription?.tenantId,
        resourceGroupName: this.node?.parent?.parent?.site.resourceGroup,
        defaultHostName: this.node?.parent?.parent?.site.defaultHostName,
      },
      workflowName: this.workflowName,
      standardApp: getStandardAppData(this.workflowName, this.workflow),
      schemaArtifacts: this.schemaArtifacts as FileDetails[],
      mapArtifacts: this.mapArtifacts as Record<string, FileDetails[]>,
    };
  }
}
