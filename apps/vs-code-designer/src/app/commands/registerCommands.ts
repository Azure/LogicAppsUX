/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { extensionCommand } from '../../constants';
import { ext } from '../../extensionVariables';
import { openDesigner } from './workflows/openDesigner/openDesigner';
import { registerCommand } from '@microsoft/vscode-azext-utils';
import type { AzExtTreeItem, IActionContext } from '@microsoft/vscode-azext-utils';

export function registerCommands(): void {
  registerCommand(extensionCommand.openDesigner, openDesigner);
  registerCommand(
    extensionCommand.loadMore,
    async (context: IActionContext, node: AzExtTreeItem) => await ext.tree.loadMore(node, context)
  );
}
