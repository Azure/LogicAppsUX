import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { Uri } from 'vscode';
import ConnectionsExt from './connectionExt';

export const openConnectionView = async (context: IActionContext, uri: Uri) => {
  new ConnectionsExt().openConnectionsPanel(context, uri.toString());
};
