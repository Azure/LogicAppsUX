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

export async function startLogicApp(context: IActionContext, node?: SlotTreeItemBase): Promise<void> {
  if (!node) {
    node = await ext.tree.showTreeItemPicker<SlotTreeItemBase>(ProductionSlotTreeItem.contextValue, context);
  }

  const client: SiteClient = await node.site.createClient(context);
  await node.runWithTemporaryDescription(context, localize('starting', 'Starting...'), async () => {
    await client.start();
  });
}
