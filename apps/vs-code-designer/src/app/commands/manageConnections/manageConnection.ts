import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { Uri } from 'vscode';
import ConnectionsExt from './connectionExt';

export const openConnectionView = async (context: IActionContext, uri: Uri) => {
  // Set map definition data to be loaded once webview sends webviewLoaded msg
  ConnectionsExt.openConnectionsPanel(context, uri.toString());
};
