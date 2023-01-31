/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { ProductionSlotTreeItem } from './ProductionSlotTreeItem';
import { SlotTreeItemBase } from './SlotTreeItemBase';
import type { SlotsTreeItem } from './SlotsTreeItem';
import type { ParsedSite } from '@microsoft/vscode-azext-azureappservice';
import type { AzExtParentTreeItem } from '@microsoft/vscode-azext-utils';

export class SlotTreeItem extends SlotTreeItemBase {
  public static contextValue = 'azLogicAppsSlot';
  public readonly contextValue: string = SlotTreeItem.contextValue;
  public readonly parent: SlotsTreeItem;

  public constructor(parent: SlotsTreeItem, site: ParsedSite) {
    super(parent, site);
  }

  public get label(): string {
    return this.site.slotName;
  }
}

export function isSlotTreeItem(treeItem: SlotTreeItem | ProductionSlotTreeItem | AzExtParentTreeItem): treeItem is SlotTreeItem {
  return !!(treeItem as SlotTreeItem).site;
}
