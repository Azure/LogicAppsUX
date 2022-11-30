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
import type { Artifacts, AzureConnectorDetails, CodelessApp, Parameter } from '@microsoft-logic-apps/utils';
import { ExtensionCommand } from '@microsoft-logic-apps/utils';
import * as path from 'path';
import * as vscode from 'vscode';

interface IDesignerPanelMetadata {
  accessToken: string;
  codelessApp: CodelessApp;
  scriptPath: string;
  connectionsData: string;
  parametersData: Record<string, Parameter>;
  localSettings: Record<string, string>;
  azureDetails: AzureConnectorDetails;
  artifacts: Artifacts;
  workflowDetails: Record<string, any>;
}

export class OpenDesignerForAzureResource extends OpenDesignerBase {
  private readonly node: RemoteWorkflowTreeItem;
  private readonly workflow: object;
  private panelMetadata: IDesignerPanelMetadata;

  constructor(context: IAzureConnectorsContext, node: RemoteWorkflowTreeItem) {
    const workflowName: string = node.name;
    const panelName = `${vscode.workspace.name}-${workflowName}`;
    const panelGroupKey = ext.webViewKey.designerAzure;

    super(context, workflowName, panelName, workflowAppApiVersion, panelGroupKey);
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
      case 'GetCallbackUrl': {
        const callbackInfo = await this.node.getCallbackUrl(this.node, msg.triggerName);
        await this.panel.webview.postMessage({
          command: 'ReceiveCallback',
          callbackInfo: { ...callbackInfo, urlTemplate: callbackInfo?.value },
        });
        break;
      }
      case 'ShowError': {
        await vscode.window.showErrorMessage(msg.errorMessage, localize('OK', 'OK'));
        break;
      }
      case 'GetConnectionConfiguration': {
        const connectionId = msg.connectionId;
        const configuration = await this.node.getConnectionConfiguration(connectionId);
        this.panel.webview.postMessage({
          command: 'ReceiveConnectionConfiguration',
          connectionId,
          configuration,
        });
        break;
      }
      case ExtensionCommand.initialize: {
        this.sendMsgToWebview({
          command: ExtensionCommand.initialize_frame,
          data: {
            panelMetadata: this.panelMetadata,
            connectionReferences: this.connectionReferences,
            baseUrl: this.baseUrl,
            apiHubServiceDetails: this.apiHubServiceDetails,
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
