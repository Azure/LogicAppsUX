import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { webviewType } from './constants';
import { ViewColumn, window } from 'vscode';
import ConnectionsPanel from './ConnectionsPanel';
import { startDesignTimeApi } from '../../utils/codeless/startDesignTimeApi';
import { getConnectionsFromFile, getLogicAppProjectRoot } from '../../utils/codeless/connection';
import * as vscode from 'vscode';
import { ConnectionsData } from '@microsoft/logic-apps-shared';
import { getAzureConnectorDetailsForLocalProject } from '../../utils/codeless/common';
import { AzureConnectorDetails } from '@microsoft/vscode-extension-logic-apps';
import { az } from 'vitest/dist/chunks/reporters.C4ZHgdxQ';

export default class ConnectionsExt {
  public connectionId: string;

  public static async openConnectionsPanel(context: IActionContext, entryUri: string) {

    const connectionId = entryUri.split('/').pop() || '';

    const currentDocumentPath = vscode.window.activeTextEditor?.document.uri.fsPath;

    const connectionsData: string = await getConnectionsFromFile(context, currentDocumentPath);
    const projectPath = await getLogicAppProjectRoot(context, currentDocumentPath); // danielle need to fix 

    const azureDetails = await getAzureConnectorDetailsForLocalProject(context, projectPath);

    const connections: ConnectionsData = JSON.parse(connectionsData);

    await startDesignTimeApi(projectPath);
    ConnectionsExt.createOrShow(connectionId, connections, azureDetails);
  }
  public static createOrShow(connectionId: string, connectionsData: ConnectionsData, azureDetails: AzureConnectorDetails) {
    // danielle handle panel already open

    const panel = window.createWebviewPanel(
      webviewType, // Key used to reference the panel,
      'Connections', // danielle to change
      ViewColumn.Active, // Editor column to show the new webview panel in
      {
        enableScripts: true,
        // NOTE: Keeps webview content state even when placed in background (same as browsers)
        // - not as performant as vscode's get/setState, but likely not a concern at all for MVP
        retainContextWhenHidden: true,
      }
    );

    new ConnectionsPanel(panel, connectionId, connectionsData, azureDetails);

  }
}
