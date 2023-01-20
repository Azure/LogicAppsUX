/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../extensionVariables';
import type { SlotTreeItem } from '../tree/slotsTree/SlotTreeItem';
import { SlotsTreeItem } from '../tree/slotsTree/SlotsTreeItem';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

export async function createSlot(context: IActionContext, node?: SlotsTreeItem): Promise<string> {
  if (!node) {
    node = await ext.tree.showTreeItemPicker<SlotsTreeItem>(SlotsTreeItem.contextValue, context);
  }

  const slotNode: SlotTreeItem = await node.createChild(context);
  return slotNode.fullId;
}
