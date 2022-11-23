/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../localize';
import { getConnections } from '../utils/codeless/apiUtils';
import { getThemedIconPath } from '../utils/tree/assets';
import type { ConfigurationsTreeItem } from './ConfigurationsTreeItem';
import { ConnectionTreeItem } from './ConnectionTreeItem';
import { getProjectContextValue } from './projectContextValues';
import { ProjectAccess, ProjectResource } from '@microsoft-logic-apps/utils';
import { AzExtParentTreeItem } from '@microsoft/vscode-azext-utils';
import type { AzExtTreeItem, ILoadingTreeContext, TreeItemIconPath } from '@microsoft/vscode-azext-utils';

export class ConnectionsTreeItem extends AzExtParentTreeItem {
  public readonly label: string = localize('Connections', 'Connections');
  public readonly childTypeLabel: string = localize('Connection', 'Connection');
  public readonly parent: ConfigurationsTreeItem;
  public isReadOnly: boolean;

  private constructor(parent: ConfigurationsTreeItem) {
    super(parent);
  }

  public static async createConnectionsTreeItem(parent: ConfigurationsTreeItem): Promise<ConnectionsTreeItem> {
    const ti: ConnectionsTreeItem = new ConnectionsTreeItem(parent);
    // initialize
    await ti.refreshImpl();
    return ti;
  }

  public async refreshImpl(): Promise<void> {
    this.isReadOnly = this.parent.isReadOnly;
  }

  public hasMoreChildrenImpl(): boolean {
    return false;
  }

  public get description(): string {
    return localize('readOnly', 'Read-only');
  }

  public get access(): ProjectAccess {
    return this.isReadOnly ? ProjectAccess.ReadOnly : ProjectAccess.ReadWrite;
  }

  public get id(): string {
    return 'connections';
  }

  public get iconPath(): TreeItemIconPath {
    return getThemedIconPath('list-unordered');
  }

  public get contextValue(): string {
    return getProjectContextValue(this.parent.parent.source, this.access, ProjectResource.Connections);
  }

  public async loadMoreChildrenImpl(_clearCache: boolean, context: ILoadingTreeContext): Promise<AzExtTreeItem[]> {
    const connections = await getConnections(context, this.parent.parent);

    return await this.createTreeItemsWithErrorHandling(
      connections,
      'azFuncInvalidConnection',
      async (connection) => await ConnectionTreeItem.create(this, connection),
      (connection) => connection.name
    );
  }
}
