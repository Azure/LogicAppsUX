/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtTreeItem, IActionContext, TreeItemIconPath } from '@microsoft/vscode-azext-utils';
import { getIconPath } from '../utils/tree/resources';
import { ProxiesTreeItem } from './ProxiesTreeItem';

export class ProxyTreeItem extends AzExtTreeItem {
    public static contextValue: string = 'azFuncProxy';
    public static readOnlyContextValue: string = 'azFuncProxyReadOnly';
    public readonly parent: ProxiesTreeItem;
    private readonly _name: string;

    public constructor(parent: ProxiesTreeItem, name: string) {
        super(parent);
        this._name = name;
    }

    public get label(): string {
        return this._name;
    }

    public get contextValue(): string {
        return this.parent.readOnly ? ProxyTreeItem.readOnlyContextValue : ProxyTreeItem.contextValue;
    }

    public get iconPath(): TreeItemIconPath {
        return getIconPath(ProxyTreeItem.contextValue);
    }

    public async deleteTreeItemImpl(context: IActionContext): Promise<void> {
        await this.parent.deleteProxy(context, this._name);
    }
}
