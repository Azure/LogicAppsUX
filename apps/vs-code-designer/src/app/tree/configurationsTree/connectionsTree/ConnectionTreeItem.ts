/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type {
  ConnectionReferenceModel,
  FunctionConnectionModel,
  IConnectionsFileContent,
  ServiceProviderConnectionModel,
} from '../../../utils/models';
import { ProjectResource } from '../../../utils/models';
import { getIconPath } from '../../../utils/tree/assets';
import { getProjectContextValue } from '../../../utils/tree/projectContextValues';
import type { ConnectionsTreeItem } from './ConnectionsTreeItem';
import type { TreeItemIconPath } from '@microsoft/vscode-azext-utils';
import { AzExtTreeItem } from '@microsoft/vscode-azext-utils';

export class ConnectionTreeItem extends AzExtTreeItem {
  public readonly parent: ConnectionsTreeItem;
  public readonly name: string;
  public readonly content: ConnectionReferenceModel | FunctionConnectionModel | ServiceProviderConnectionModel;
  private _fullName: string;
  private _isManaged: boolean;

  private constructor(
    parent: ConnectionsTreeItem,
    name: string,
    content: ConnectionReferenceModel | FunctionConnectionModel | ServiceProviderConnectionModel,
    isManaged: boolean
  ) {
    super(parent);
    this.name = name;
    this.content = content;
    this._isManaged = isManaged;
    this._fullName =
      !this._isManaged && (content as FunctionConnectionModel | ServiceProviderConnectionModel).displayName
        ? `${name} - ${(content as FunctionConnectionModel | ServiceProviderConnectionModel).displayName}`
        : name;
    this.commandId = 'logicAppsExtension.viewContent';
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
