/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getIconPath } from '../../utils/tree/assets';
import { LogicAppResourceTree } from '../LogicAppResourceTree';
import type { ConfigurationsTreeItem } from '../configurationsTree/ConfigurationsTreeItem';
import type { RemoteWorkflowTreeItem } from '../remoteWorkflowsTree/RemoteWorkflowTreeItem';
import type { AppSettingsTreeItem, DeploymentsTreeItem, IDeployContext, ParsedSite } from '@microsoft/vscode-azext-azureappservice';
import { AzExtParentTreeItem } from '@microsoft/vscode-azext-utils';
import type { AzExtTreeItem, IActionContext } from '@microsoft/vscode-azext-utils';
import type {
  ApplicationSettings,
  FuncHostRequest,
  FuncVersion,
  IParsedHostJson,
  IProjectTreeItem,
} from '@microsoft/vscode-extension-logic-apps';
import { ProjectSource } from '@microsoft/vscode-extension-logic-apps';

export class SlotTreeItem extends AzExtParentTreeItem implements IProjectTreeItem {
  public logStreamPath = '';
  public configurationsTreeItem: ConfigurationsTreeItem;
  public deploymentsNode: DeploymentsTreeItem | undefined;
  public readonly source: ProjectSource = ProjectSource.Remote;
  public site: ParsedSite;
  public readonly appSettingsTreeItem: AppSettingsTreeItem;

  public readonly contextValue: string;

  public resourceTree: LogicAppResourceTree;

  public constructor(parent: AzExtParentTreeItem, resourceTree: LogicAppResourceTree) {
    super(parent);
    this.resourceTree = resourceTree;
    // this is for the slotContextValue because it never gets resolved by the Resources extension
    const slotContextValue = this.resourceTree.site.isSlot
      ? LogicAppResourceTree.slotContextValue
      : LogicAppResourceTree.productionContextValue;
    const contextValues = [slotContextValue, 'slot'];
    this.contextValue = Array.from(new Set(contextValues)).sort().join(';');
    this.site = this.resourceTree.site;
    this.iconPath = getIconPath(slotContextValue);
  }

  public get id(): string {
    return this.resourceTree.label;
  }

  public get description(): string | undefined {
    return this.resourceTree.description;
  }

  public get label(): string {
    return this.resourceTree.label;
  }

  public hasMoreChildrenImpl(): boolean {
    return this.resourceTree.hasMoreChildrenImpl();
  }

  public get logStreamLabel(): string {
    return this.resourceTree.logStreamLabel;
  }

  public async getHostRequest(): Promise<FuncHostRequest> {
    return await this.resourceTree.getHostRequest();
  }

  /**
   * NOTE: We need to be extra careful in this method because it blocks many core scenarios (e.g. deploy) if the tree item is listed as invalid
   */
  public async refreshImpl(context: IActionContext): Promise<void> {
    return await this.resourceTree.refreshImpl(context);
  }

  public async getVersion(context: IActionContext): Promise<FuncVersion> {
    return await this.resourceTree.getVersion(context);
  }

  public async getHostJson(context: IActionContext): Promise<IParsedHostJson> {
    return await this.resourceTree.getHostJson(context);
  }

  public async getApplicationSettings(context: IDeployContext): Promise<ApplicationSettings> {
    return await this.resourceTree.getApplicationSettings(context);
  }

  public async setApplicationSetting(context: IActionContext, key: string, value: string): Promise<void> {
    return await this.resourceTree.setApplicationSetting(context, key, value);
  }

  public async loadMoreChildrenImpl(_clearCache: boolean, context: IActionContext): Promise<AzExtTreeItem[]> {
    return (await this.resourceTree.loadMoreChildrenImpl.call(this, _clearCache, context)) as AzExtTreeItem[];
  }

  public async pickTreeItemImpl(expectedContextValues: (string | RegExp)[], _context: IActionContext): Promise<AzExtTreeItem | undefined> {
    return await this.resourceTree.pickTreeItemImpl(expectedContextValues);
  }

  public compareChildrenImpl(): number {
    return this.resourceTree.compareChildrenImpl();
  }

  public async isReadOnly(context: IActionContext): Promise<boolean> {
    return await this.resourceTree.isReadOnly(context);
  }

  public async deleteTreeItemImpl(context: IActionContext): Promise<void> {
    await this.resourceTree.deleteTreeItemImpl(context);
  }
}

export function isSlotTreeItem(treeItem: SlotTreeItem | RemoteWorkflowTreeItem | AzExtParentTreeItem): treeItem is SlotTreeItem {
  return !!(treeItem as SlotTreeItem).site;
}
