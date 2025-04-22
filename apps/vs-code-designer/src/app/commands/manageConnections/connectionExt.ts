import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { webviewType } from './constants';
import { ViewColumn, window } from 'vscode';

export default class ConnectionsExt {
  public static async openConnectionsPanel(context: IActionContext, connectionId: string) {
    ConnectionsExt.createOrShow(connectionId);
  }
  public static createOrShow(_connectionId: string) {
    // danielle handle panel already open

    window.createWebviewPanel(
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
