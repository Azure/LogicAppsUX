import { workflowAppApiVersion } from '../../../../constants';
import { ext } from '../../../../extensionVariables';
import { localize } from '../../../../localize';
import type { RemoteWorkflowTreeItem } from '../../../tree/remoteWorkflowsTree/RemoteWorkflowTreeItem';
import {
  removeWebviewPanelFromCache,
  cacheWebviewPanel,
  getCodelessAppData,
  getWorkflowManagementBaseURI,
} from '../../../utils/codeless/common';
import { getAuthorizationToken } from '../../../utils/codeless/getAuthorizationToken';
import type { IAzureConnectorsContext } from '../azureConnectorWizard';
import { OpenDesignerBase } from './openDesignerBase';
import type { ServiceClientCredentials } from '@azure/ms-rest-js';
import type { IDesignerPanelMetadata, IWorkflowFileContent } from '@microsoft/utils-logic-apps';
import { ExtensionCommand } from '@microsoft/utils-logic-apps';
import * as path from 'path';
import * as vscode from 'vscode';

export class OpenDesignerForAzureResource extends OpenDesignerBase {
  private readonly node: RemoteWorkflowTreeItem;
  private readonly workflow: IWorkflowFileContent;
  private panelMetadata: IDesignerPanelMetadata;

  constructor(context: IAzureConnectorsContext, node: RemoteWorkflowTreeItem) {
    const workflowName: string = node.name;
    const panelName = `${vscode.workspace.name}-${workflowName}`;
    const panelGroupKey = ext.webViewKey.designerAzure;

    super(context, workflowName, panelName, workflowAppApiVersion, panelGroupKey, true, false);

    this.node = node;
    this.workflow = node.workflowFileContent;
    this.baseUrl = getWorkflowManagementBaseURI(node);
  }

  public async createPanel(): Promise<void> {
    const existingPanel: vscode.WebviewPanel | undefined = this.getExistingPanel();

    if (existingPanel) {
      if (!existingPanel.active) {
        existingPanel.reveal(vscode.ViewColumn.Active);
        return;
      }
    }

    vscode.window.showInformationMessage(localize('logicApps.designer', 'Starting workflow designer. It might take a few seconds.'), 'OK');
    this.panel = vscode.window.createWebviewPanel(this.panelGroupKey, this.workflowName, vscode.ViewColumn.Active, this.getPanelOptions());
    this.panelMetadata = await this.getDesignerPanelMetadata();

    this.panel.webview.html = await this.getWebviewContent({
      connectionsData: this.panelMetadata.connectionsData,
      parametersData: this.panelMetadata.parametersData || {},
      localSettings: this.panelMetadata.localSettings,
      artifacts: this.panelMetadata.artifacts,
      azureDetails: this.panelMetadata.azureDetails,
    });

    this.panel.webview.onDidReceiveMessage(async (message) => await this._handleWebviewMsg(message), ext.context.subscriptions);

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

  private async _handleWebviewMsg(msg: any) {
    switch (msg.command) {
      case ExtensionCommand.initialize: {
        this.sendMsgToWebview({
          command: ExtensionCommand.initialize_frame,
          data: {
            panelMetadata: this.panelMetadata,
            connectionReferences: this.connectionReferences,
            baseUrl: this.baseUrl,
            apiVersion: this.apiVersion,
            apiHubServiceDetails: this.apiHubServiceDetails,
            readOnly: this.readOnly,
            isLocal: this.isLocal,
          },
        });
        break;
      }
      default:
        break;
    }
  }

  private async getDesignerPanelMetadata(): Promise<IDesignerPanelMetadata> {
    const parameters = await this.node.getParametersData();
    const credentials: ServiceClientCredentials = this.node.credentials;
    const accessToken: string = await getAuthorizationToken(credentials);

    return {
      connectionsData: await this.node.getConnectionsData(),
      parametersData: await this.node.getParametersData(),
      localSettings: await this.node.getAppSettings(),
      accessToken,
      scriptPath: this.panel.webview.asWebviewUri(vscode.Uri.file(path.join(ext.context.extensionPath, 'dist', 'designer'))).toString(),
      azureDetails: {
        enabled: true,
        accessToken,
        subscriptionId: this.node.subscription.subscriptionId,
        location: this.normalizeLocation(this.node?.parent?.parent?.site.location),
        workflowManagementBaseUrl: this.node?.parent?.subscription?.environment?.resourceManagerEndpointUrl,
      },
      workflowDetails: await this.node.getChildWorkflows(this.context),
      artifacts: await this.node.getArtifacts(),
      codelessApp: getCodelessAppData(this.workflowName, this.workflow, parameters),
    };
  }

  private normalizeLocation(location: string): string {
    if (!location) {
      return '';
    }
    return location.toLowerCase().replace(/ /g, '');
  }
}
