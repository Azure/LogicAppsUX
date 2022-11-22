/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ParsedSite } from '@microsoft/vscode-azext-azureappservice';
import { AzExtTreeItem, IActionContext } from '@microsoft/vscode-azext-utils';
import { localize } from '../../localize';
import { SlotsTreeItem } from './SlotsTreeItem';
import { SlotTreeItem } from './SlotTreeItem';
import { SlotTreeItemBase } from './SlotTreeItemBase';
import { SubscriptionTreeItem } from './SubscriptionTreeItem';

export class ProductionSlotTreeItem extends SlotTreeItemBase {
    public static contextValue: string = 'azFuncProductionSlot';
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
        if (await this.supportsSlots(context)) {
            children.push(this._slotsTreeItem);
        }
        return children;
    }

    public async pickTreeItemImpl(expectedContextValues: (string | RegExp)[], context: IActionContext): Promise<AzExtTreeItem | undefined> {
        for (const expectedContextValue of expectedContextValues) {
            switch (expectedContextValue) {
                case SlotsTreeItem.contextValue:
                case SlotTreeItem.contextValue:
                    if (await this.supportsSlots(context)) {
                        return this._slotsTreeItem;
                    } else {
                        throw new Error(localize('slotNotSupported', 'Linux Consumption apps do not support slots.'));
                    }
                default:
            }
        }

        return super.pickTreeItemImpl(expectedContextValues, context);
    }

    private async supportsSlots(context: IActionContext): Promise<boolean> {
        // Slots are not yet supported for Linux Consumption
        return !this.site.isLinux || !await this.getIsConsumption(context);
    }
}
