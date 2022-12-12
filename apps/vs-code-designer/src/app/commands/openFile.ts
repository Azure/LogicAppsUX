/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { extensionCommand } from '../../constants';
import type { FileTreeItem } from '@microsoft/vscode-azext-azureappservice';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { commands } from 'vscode';

export async function openFile(context: IActionContext, node: FileTreeItem): Promise<void> {
  await commands.executeCommand(extensionCommand.azureFunctionsOpenFile, node, context);
}
