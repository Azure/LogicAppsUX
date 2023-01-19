/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../extensionVariables';
import { ProductionSlotTreeItem } from '../tree/slotsTree/ProductionSlotTreeItem';
import { openInPortal as uiOpenInPortal } from '@microsoft/vscode-azext-azureutils';
import type { AzExtTreeItem, IActionContext } from '@microsoft/vscode-azext-utils';

export async function openInPortal(context: IActionContext, node?: AzExtTreeItem): Promise<void> {
  if (!node) {
    node = await ext.tree.showTreeItemPicker<AzExtTreeItem>(ProductionSlotTreeItem.contextValue, context);
  }

  await uiOpenInPortal(node, node.fullId);
}
