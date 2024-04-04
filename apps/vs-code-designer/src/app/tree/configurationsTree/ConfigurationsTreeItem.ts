/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../localize';
import { getThemedIconPath } from '../../utils/tree/assets';
import { getProjectContextValue } from '../../utils/tree/projectContextValues';
import type { SlotTreeItem } from '../slotsTree/SlotTreeItem';
import { ConnectionsTreeItem } from './connectionsTree/ConnectionsTreeItem';
import { ParametersTreeItem } from './parametersTree/ParametersTreeItem';
import { AppSettingsTreeItem } from '@microsoft/vscode-azext-azureappservice';
import { AzExtParentTreeItem } from '@microsoft/vscode-azext-utils';
import type { AzExtTreeItem, IActionContext, TreeItemIconPath } from '@microsoft/vscode-azext-utils';
import { ProjectAccess, ProjectResource } from '@microsoft/vscode-extension-logic-apps';

export class ConfigurationsTreeItem extends AzExtParentTreeItem {
  public static contextValue = 'azLogicAppsConfigurations';
  public readonly label: string = localize('Configurations', 'Configurations');
  public readonly parent: SlotTreeItem;
  public readonly appSettingsTreeItem: AppSettingsTreeItem;
  public isReadOnly: boolean;

  private _connectionsTreeItem: ConnectionsTreeItem;
  private _parametersTreeItem: ParametersTreeItem;

  private constructor(parent: SlotTreeItem) {
    super(parent);
    this.appSettingsTreeItem = new AppSettingsTreeItem(this, this.parent.site);
  }

  public static async createConfigurationsTreeItem(parent: SlotTreeItem, context: IActionContext): Promise<ConfigurationsTreeItem> {
    const treeItem: ConfigurationsTreeItem = new ConfigurationsTreeItem(parent);
    await treeItem.refreshImpl(context);
    return treeItem;
  }

  public async refreshImpl(context: IActionContext): Promise<void> {
    this.isReadOnly = await this.parent.isReadOnly(context);
  }

  public hasMoreChildrenImpl(): boolean {
    return false;
  }

  public get description(): string {
    return '';
  }

  public get access(): ProjectAccess {
    return this.isReadOnly ? ProjectAccess.ReadOnly : ProjectAccess.ReadWrite;
  }

  public get id(): string {
    return 'configurations';
  }

  public get iconPath(): TreeItemIconPath {
    return getThemedIconPath('list-unordered');
  }

  public get contextValue(): string {
    return getProjectContextValue(this.parent.source, this.access, ProjectResource.Configurations);
  }

  public async loadMoreChildrenImpl(): Promise<AzExtTreeItem[]> {
    if (!this._connectionsTreeItem) {
      this._connectionsTreeItem = await ConnectionsTreeItem.createConnectionsTreeItem(this);
    }

    if (!this._parametersTreeItem) {
      this._parametersTreeItem = await ParametersTreeItem.createParametersTreeItem(this);
    }

    return [this.appSettingsTreeItem, this._connectionsTreeItem, this._parametersTreeItem];
  }
}
