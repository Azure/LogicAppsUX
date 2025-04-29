import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { webviewType } from './constants';
import { ViewColumn, window } from 'vscode';
import ConnectionsPanel from './ConnectionsPanel';
import { startDesignTimeApi } from '../../utils/codeless/startDesignTimeApi';
import { getLogicAppProjectRoot } from '../../utils/codeless/connection';
import * as vscode from 'vscode';

export default class ConnectionsExt {
  public connectionId: string;

  public static async openConnectionsPanel(context: IActionContext, entryUri: string) {

    const connectionId = entryUri.split('/').pop() || '';

    const p = vscode.window.activeTextEditor?.document.uri;
    //const project = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const projectPath = await getLogicAppProjectRoot(context, p.fsPath); // danielle need to fix 
    await startDesignTimeApi(projectPath);
    ConnectionsExt.createOrShow(connectionId);
  }
  public static createOrShow(connectionId: string) {
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

    new ConnectionsPanel(panel, connectionId);

    // ext.dataMapPanelManagers[dataMapName] = new DataMapperPanel(
    //   panel,
    //   dataMapName
    // );
    // ext.dataMapPanelManagers[dataMapName].panel.iconPath = {
    //   light: Uri.file(
    //     path.join(ext.context.extensionPath, "assets", "light", "wand.png")
    //   ),
    //   dark: Uri.file(
    //     path.join(ext.context.extensionPath, "assets", "dark", "wand.png")
    //   ),
    // };
    // ext.dataMapPanelManagers[dataMapName].updateWebviewPanelTitle();
    // ext.dataMapPanelManagers[dataMapName].mapDefinitionData = mapDefinitionData;

    // From here, VSIX will handle any other initial-load-time events once receive webviewLoaded msg
  }
}
