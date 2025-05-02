import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { CreateConnectionPanel } from './constants';
import { ViewColumn, window } from 'vscode';
import ConnectionsPanel from './ConnectionsPanel';
import { startDesignTimeApi } from '../../utils/codeless/startDesignTimeApi';
import { getConnectionsFromFile, getLogicAppProjectRoot } from '../../utils/codeless/connection';
import * as vscode from 'vscode';
import type { ConnectionsData } from '@microsoft/logic-apps-shared';
import { getRecordEntry } from '@microsoft/logic-apps-shared';
import { cacheWebviewPanel, getAzureConnectorDetailsForLocalProject } from '../../utils/codeless/common';
import type { AzureConnectorDetails } from '@microsoft/vscode-extension-logic-apps';
import { azurePublicBaseUrl, localSettingsFileName, workflowManagementBaseURIKey } from '../../../constants';
import { getLocalSettingsJson } from '../../utils/appSettings/localSettings';
import path from 'path';
import { ext } from '../../../extensionVariables';

export default class ConnectionsExt {
  public connectionId: string;
  private codefulFilePath: string;

  public async openConnectionsPanel(context: IActionContext, entryUri: string) {
    const connectionId = entryUri.split('/').pop() || '';

    this.codefulFilePath = vscode.window.activeTextEditor.document.uri.fsPath;

    const panelName = `${connectionId}-Connections`;

    const currentDocumentPath = vscode.window.activeTextEditor?.document.uri.fsPath;

    const connectionsData: string = await getConnectionsFromFile(context, currentDocumentPath);
    const projectPath = await getLogicAppProjectRoot(context, currentDocumentPath); // danielle need to fix

    const callbackUri: vscode.Uri = await (vscode.env as any).asExternalUri(
      vscode.Uri.parse(`${vscode.env.uriScheme}://ms-azuretools.vscode-azurelogicapps/authcomplete`)
    );

    const oauthRedirectUrl = callbackUri.toString(true);

    const azureDetails = await getAzureConnectorDetailsForLocalProject(context, projectPath);

    const localSettings = (await getLocalSettingsJson(context, path.join(projectPath, localSettingsFileName))).Values;

    const apiHubServiceDetails = getApiHubServiceDetails(azureDetails, localSettings);

    const connections: ConnectionsData = JSON.parse(connectionsData);

    await startDesignTimeApi(projectPath);
    this.createOrShow({
      connectionId,
      connectionsData: connections,
      azureDetails,
      apiHubServiceDetails,
      oauthRedirectUrl,
      panelId: panelName,
      projectPath,
      context,
    });
  }
  public createOrShow(connectionParams: CreateConnectionPanel) {
    // danielle handle panel already open
    const panelGroupKey = ext.webViewKey.connection;

    const panel = window.createWebviewPanel(
      panelGroupKey, // Key used to reference the panel,
      connectionParams.panelId, // danielle to change
      ViewColumn.Active, // Editor column to show the new webview panel in
      {
        enableScripts: true,
        // NOTE: Keeps webview content state even when placed in background (same as browsers)
        // - not as performant as vscode's get/setState, but likely not a concern at all for MVP
        retainContextWhenHidden: true,
      }
    );

    panel.onDidDispose(async () => {
      const document = await vscode.workspace.openTextDocument(this.codefulFilePath);

      await vscode.window.showTextDocument(document);
    });

    cacheWebviewPanel(panelGroupKey, connectionParams.panelId, panel);

    new ConnectionsPanel(panel, connectionParams);
  }
}

function getApiHubServiceDetails(azureDetails: AzureConnectorDetails, localSettings: Record<string, any>) {
  const isApiHubEnabled = azureDetails.enabled;
  const workflowManagementBaseUrl = getRecordEntry(localSettings, workflowManagementBaseURIKey) ?? azurePublicBaseUrl;

  return isApiHubEnabled
    ? {
        apiVersion: '2018-07-01-preview',
        baseUrl: workflowManagementBaseUrl,
        subscriptionId: azureDetails.subscriptionId,
        location: azureDetails.location,
        resourceGroup: azureDetails.resourceGroupName,
        tenantId: azureDetails.tenantId,
        resourceGroupName: azureDetails.resourceGroupName,
        getAccessToken: () => Promise.resolve(azureDetails.accessToken),
      }
    : undefined;
}
