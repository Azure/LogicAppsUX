/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../extensionVariables';
import { ProductionSlotTreeItem } from '../tree/slotsTree/ProductionSlotTreeItem';
import type { SlotTreeItemBase } from '../tree/slotsTree/SlotTreeItemBase';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { openReadOnlyJson } from '@microsoft/vscode-azext-utils';

export async function viewProperties(context: IActionContext, node?: SlotTreeItemBase | ProductionSlotTreeItem): Promise<void> {
  if (!node) {
    node = await ext.rgApi.appResourceTree.showTreeItemPicker<ProductionSlotTreeItem>(ProductionSlotTreeItem.contextValue, context);
  }

  const data = node.site;

  await openReadOnlyJson(node, data);
}
