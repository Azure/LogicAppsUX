/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ConnectionReferenceModel, FunctionConnectionModel, IConnectionsFileContent, ProjectResource, ServiceProviderConnectionModel } from "@microsoft-logic-apps/utils";
import { AzExtTreeItem, TreeItemIconPath } from "@microsoft/vscode-azext-utils";
import { getIconPath } from "../utils/tree/resources";
import { ConnectionsTreeItem } from './ConnectionsTreeItem';
import { getProjectContextValue } from './projectContextValues';

export class ConnectionTreeItem extends AzExtTreeItem {
    public readonly parent: ConnectionsTreeItem;
    public readonly name: string;
    public readonly content: ConnectionReferenceModel | FunctionConnectionModel | ServiceProviderConnectionModel;
    private _fullName: string;
    private _isManaged: boolean;

    private constructor(parent: ConnectionsTreeItem, name: string, content: ConnectionReferenceModel | FunctionConnectionModel | ServiceProviderConnectionModel, isManaged: boolean) {
        super(parent);
        this.name = name;
        this.content = content;
        this._isManaged = isManaged;
        this._fullName = !this._isManaged && (<FunctionConnectionModel | ServiceProviderConnectionModel>content).displayName
            ? `${name} - ${(<FunctionConnectionModel | ServiceProviderConnectionModel>content).displayName}`
            : name;
        this.commandId = 'azureLogicAppsStandard.viewContent';
    }

    public get id(): string {
        return this._fullName;
    }

    public get label(): string {
        return this._fullName;
    }

    public get contextValue(): string {
        return getProjectContextValue(this.parent.parent.parent.source, this.parent.access, ProjectResource.Connections);
    }

    public get iconPath(): TreeItemIconPath {
        return getIconPath('Connection');
    }

    public static async create(parent: ConnectionsTreeItem, fileContent: IConnectionsFileContent): Promise<ConnectionTreeItem> {
        const { content, isManaged, name } = fileContent;
        return new ConnectionTreeItem(parent, name, content, isManaged);
    }
}
