/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ParsedSite } from '@microsoft/vscode-azext-azureappservice';
import { SlotsTreeItem } from './SlotsTreeItem';
import { SlotTreeItemBase } from './SlotTreeItemBase';

export class SlotTreeItem extends SlotTreeItemBase {
    public static contextValue: string = 'azFuncSlot';
    public readonly contextValue: string = SlotTreeItem.contextValue;
    public readonly parent: SlotsTreeItem;

    public constructor(parent: SlotsTreeItem, site: ParsedSite) {
        super(parent, site);
    }

    public get label(): string {
        // tslint:disable-next-line:no-non-null-assertion
        return this.site.slotName!;
    }
}
