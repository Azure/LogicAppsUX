/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../extensionVariables';
import { SlotTreeItem } from '../tree/slotsTree/SlotTreeItem';
import * as appservice from '@microsoft/vscode-azext-azureappservice';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

export async function swapSlot(context: IActionContext, sourceSlotNode?: SlotTreeItem): Promise<void> {
  if (!sourceSlotNode) {
    sourceSlotNode = await ext.tree.showTreeItemPicker<SlotTreeItem>(SlotTreeItem.contextValue, context);
  }

  const deploymentSlots: SlotTreeItem[] = (await sourceSlotNode.parent.getCachedChildren(context)) as SlotTreeItem[];
  await appservice.swapSlot(
    context,
    sourceSlotNode.site,
    deploymentSlots.map((ds) => ds.site)
  );
  await sourceSlotNode.parent.parent.refresh(context);
}
