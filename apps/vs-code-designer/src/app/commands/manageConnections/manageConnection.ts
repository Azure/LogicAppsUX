import type { IActionContext } from '@microsoft/vscode-azext-utils';
import ConnectionsExt from './connectionExt';

export const openConnectionView = async (context: IActionContext, args: any[]) => {
  new ConnectionsExt().openConnectionsPanel(context, args);
};
