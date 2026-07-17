/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { CodeSelection } from '@microsoft/vscode-extension-logic-apps';
import ConnectionPanel from './panels/connectionPanel';

export async function openConnectionView(
  context: IActionContext,
  filePath: string,
  methodName: string,
  connectorName: string,
  connectorType: string,
  range: CodeSelection,
  currentConnectionId: string
): Promise<void> {
  const connectionPanel = new ConnectionPanel(context, filePath, methodName, connectorName, connectorType, range, currentConnectionId);
  await connectionPanel.create();
}
