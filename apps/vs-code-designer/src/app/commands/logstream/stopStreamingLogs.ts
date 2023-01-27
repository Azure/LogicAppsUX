/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import { ProductionSlotTreeItem } from '../../tree/slotsTree/ProductionSlotTreeItem';
import type { SlotTreeItemBase } from '../../tree/slotsTree/SlotTreeItemBase';
import * as appservice from '@microsoft/vscode-azext-azureappservice';
import type { ParsedSite } from '@microsoft/vscode-azext-azureappservice';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

export async function stopStreamingLogs(context: IActionContext, node?: SlotTreeItemBase): Promise<void> {
  if (!node) {
    node = await ext.tree.showTreeItemPicker<SlotTreeItemBase>(ProductionSlotTreeItem.contextValue, context);
  }

  const site: ParsedSite = node.site;
  await appservice.stopStreamingLogs(site, node.logStreamPath);
}
