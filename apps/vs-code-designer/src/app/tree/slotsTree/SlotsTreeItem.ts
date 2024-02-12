/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../localize';
import { showSiteCreated } from '../../commands/createLogicApp/showSiteCreated';
import { getIconPath } from '../../utils/tree/assets';
import { LogicAppResourceTree } from '../LogicAppResourceTree';
import { SlotTreeItem } from './SlotTreeItem';
import type { Site, WebSiteManagementClient, SitePatchResource } from '@azure/arm-appservice';
import { createSlot, createWebSiteClient, ParsedSite } from '@microsoft/vscode-azext-azureappservice';
import { uiUtils } from '@microsoft/vscode-azext-azureutils';
import type { AzExtTreeItem, IActionContext, TreeItemIconPath, ICreateChildImplContext } from '@microsoft/vscode-azext-utils';
import { AzExtParentTreeItem, nonNullProp } from '@microsoft/vscode-azext-utils';

export class SlotsTreeItem extends AzExtParentTreeItem {
  public static contextValue = 'azLogicAppsSlots';
  public readonly contextValue: string = SlotsTreeItem.contextValue;
  public readonly label: string = localize('slots', 'Slots');
  public readonly childTypeLabel: string = localize('slot', 'Slot');
  public readonly parent: SlotTreeItem;

  private _nextLink: string | undefined;

  public constructor(parent: SlotTreeItem) {
    super(parent);
  }

  public get id(): string {
    return 'slots';
  }

  public get iconPath(): TreeItemIconPath {
    return getIconPath(this.contextValue);
  }

  public hasMoreChildrenImpl(): boolean {
    return this._nextLink !== undefined;
  }

  public async loadMoreChildrenImpl(clearCache: boolean, context: IActionContext): Promise<AzExtTreeItem[]> {
    if (clearCache) {
      this._nextLink = undefined;
    }

    const client: WebSiteManagementClient = await createWebSiteClient([context, this]);
    const webAppCollection: Site[] = await uiUtils.listAllIterator(
      client.webApps.listSlots(this.parent.site.resourceGroup, this.parent.site.siteName)
    );

    return await this.createTreeItemsWithErrorHandling(
      webAppCollection,
      'azLogicAppInvalidSlot',
      async (site: Site) => {
        return new SlotTreeItem(this, new LogicAppResourceTree(this.subscription, site));
      },
      (site: Site) => {
        return site.name;
      }
    );
  }

  public async createChildImpl(context: ICreateChildImplContext): Promise<AzExtTreeItem> {
    const existingSlots: SlotTreeItem[] = (await this.getCachedChildren(context)) as SlotTreeItem[];
    let newSite: Site = await createSlot(
      this.parent.site,
      existingSlots.map((s) => s.site),
      context
    );

    newSite = await this.updateSlotIdentity(context, newSite);
    const parsedSite = new ParsedSite(newSite, this.subscription);
    showSiteCreated(parsedSite, context);
    return new SlotTreeItem(this, new LogicAppResourceTree(this.subscription, newSite));
  }

  private async updateSlotIdentity(context: ICreateChildImplContext, site: Site): Promise<Site> {
    const [siteName, slotName] = nonNullProp(site, 'name').split('/');

    if (!slotName) {
      return site;
    }

    const client: WebSiteManagementClient = await createWebSiteClient([context, this]);
    const siteEnvelope: SitePatchResource = {
      identity: {
        type: 'SystemAssigned',
      },
    };

    await client.webApps.updateSlot(site.resourceGroup, siteName, slotName, siteEnvelope);
    return await client.webApps.getSlot(site.resourceGroup, siteName, slotName);
  }
}
