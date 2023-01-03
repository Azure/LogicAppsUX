/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../localize';
import type { SubscriptionTreeItem } from '../subscriptionTree/SubscriptionTreeItem';
import { SlotTreeItem } from './SlotTreeItem';
import { SlotTreeItemBase } from './SlotTreeItemBase';
import { SlotsTreeItem } from './SlotsTreeItem';
import type { ParsedSite } from '@microsoft/vscode-azext-azureappservice';
import type { AzExtTreeItem, IActionContext } from '@microsoft/vscode-azext-utils';

export class ProductionSlotTreeItem extends SlotTreeItemBase {
  public static contextValue = 'azLogicAppsProductionSlot';
  public readonly contextValue: string = ProductionSlotTreeItem.contextValue;

  private readonly _slotsTreeItem: SlotsTreeItem;

  public constructor(parent: SubscriptionTreeItem, site: ParsedSite) {
    super(parent, site);
    this._slotsTreeItem = new SlotsTreeItem(this);
  }

  public get label(): string {
    return this.site.fullName;
  }

  public async loadMoreChildrenImpl(clearCache: boolean, context: IActionContext): Promise<AzExtTreeItem[]> {
    const children: AzExtTreeItem[] = await super.loadMoreChildrenImpl(clearCache, context);
    if (await this.supportsSlots()) {
      children.push(this._slotsTreeItem);
    }
    return children;
  }

  public async pickTreeItemImpl(expectedContextValues: (string | RegExp)[], context: IActionContext): Promise<AzExtTreeItem | undefined> {
    for (const expectedContextValue of expectedContextValues) {
      switch (expectedContextValue) {
        case SlotsTreeItem.contextValue:
        case SlotTreeItem.contextValue:
          if (await this.supportsSlots()) {
            return this._slotsTreeItem;
          } else {
            throw new Error(localize('slotNotSupported', 'Linux apps do not support slots.'));
          }
        default:
      }
    }

    return super.pickTreeItemImpl(expectedContextValues, context);
  }

  private async supportsSlots(): Promise<boolean> {
    // Slots are not yet supported for Linux Consumption
    return !this.site.isLinux;
  }
}
