/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { FolderTreeItem, ParsedSite } from '@microsoft/vscode-azext-azureappservice';
import { localize } from '../../localize';
import { SlotTreeItemBase } from './SlotTreeItemBase';

export class ArtifactsTreeItem extends FolderTreeItem {
    public static contextValue: string = 'Artifacts';
    private readonly _contextValue: string = ArtifactsTreeItem.contextValue;

    public get contextValue(): string {
        return this._contextValue;
    }

    protected readonly _isRoot: boolean = false;

    constructor(parent: SlotTreeItemBase, client: ParsedSite) {
        super(parent, {
            site: client,
            label: localize('Artifacts', 'Artifacts'),
            path: '/site/wwwroot/Artifacts',
            isReadOnly: true,
        });
    }
}
