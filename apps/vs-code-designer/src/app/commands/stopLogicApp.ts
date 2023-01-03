/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { ProductionSlotTreeItem } from '../tree/slotsTree/ProductionSlotTreeItem';
import type { SlotTreeItemBase } from '../tree/slotsTree/SlotTreeItemBase';
import type { SiteClient } from '@microsoft/vscode-azext-azureappservice';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

export async function stopLogicApp(context: IActionContext, node?: SlotTreeItemBase): Promise<SlotTreeItemBase> {
  if (!node) {
    node = await ext.tree.showTreeItemPicker<SlotTreeItemBase>(ProductionSlotTreeItem.contextValue, context);
  }

  const client: SiteClient = await node.site.createClient(context);
  await node.runWithTemporaryDescription(context, localize('stopping', 'Stopping...'), async () => {
    await client.stop();
  });
  return node;
}
