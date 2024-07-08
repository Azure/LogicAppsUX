import { LogicAppResourceTree } from './app/tree/LogicAppResourceTree';
import { logicAppFilter } from './constants';
import { ext } from './extensionVariables';
import type { Site } from '@azure/arm-appservice';
import { createWebSiteClient } from '@microsoft/vscode-azext-azureappservice';
import { uiUtils } from '@microsoft/vscode-azext-azureutils';
import type { IActionContext, ISubscriptionContext } from '@microsoft/vscode-azext-utils';
import { callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import type { AppResource, AppResourceResolver } from '@microsoft/vscode-azext-utils/hostapi';
import { createContainerClient } from './app/utils/azureClients';
import type { ContainerApp } from '@azure/arm-appcontainers';

export class LogicAppResolver implements AppResourceResolver {
  public async resolveResource(subContext: ISubscriptionContext, resource: AppResource): Promise<LogicAppResourceTree | undefined> {
    return await callWithTelemetryAndErrorHandling('resolveResource', async (context: IActionContext) => {
      const site: Site = await LogicAppResolver.getAppResourceSite(context, subContext, resource);
      if (!site) {
        return;
      }
      return LogicAppResourceTree.createLogicAppResourceTree(context, subContext, site);
    });
  }

  public matchesResource(resource: AppResource): boolean {
    return resource.type.toLowerCase() === logicAppFilter.type && resource.kind?.toLowerCase() === logicAppFilter.kind;
  }

  static async getSubscriptionSites(context: IActionContext, subContext: ISubscriptionContext) {
    const client = await createWebSiteClient({ ...context, ...subContext });
    const clientContainer = await createContainerClient({ ...context, ...subContext });
    const listOfSites: Site[] = await uiUtils.listAllIterator(client.webApps.list());
    const listOfHybridSites = (await uiUtils.listAllIterator(clientContainer.containerApps.listBySubscription())).filter(
      (site) => site.managedEnvironmentId === null && site.extendedLocation
    );

    const subscriptionSites = new Map<string, Site>();
    const subscriptionHybridSites = new Map<string, ContainerApp>();

    listOfSites.forEach((item: Site) => {
      subscriptionSites.set(item.id, item);
    });

    listOfHybridSites.forEach((item: ContainerApp) => {
      subscriptionHybridSites.set(item.id, item);
    });

    ext.logicAppSitesMap.set(subContext.subscriptionId, subscriptionSites);
    ext.hybridLogicAppSitesMap.set(subContext.subscriptionId, subscriptionHybridSites);

    return { logicApps: subscriptionSites, hybridLogicApps: subscriptionHybridSites };
  }

  static async getAppResourceSite(context: IActionContext, subContext: ISubscriptionContext, resource: AppResource): Promise<Site> {
    const logicAppsSites = ext.logicAppSitesMap.get(subContext.subscriptionId);
    let site: Site;

    if (logicAppsSites) {
      site = ext.logicAppSitesMap.get(subContext.subscriptionId).get(resource.id);
    } else {
      const subscriptionSites = (await LogicAppResolver.getSubscriptionSites(context, subContext)).logicApps;
      site = subscriptionSites.get(resource.id);
    }
    return site;
  }

  static async getAppResourceSiteBySubscription(context: IActionContext, subContext: ISubscriptionContext) {
    const logicAppsSites = ext.logicAppSitesMap.get(subContext.subscriptionId);
    const hybridLogicAppsSites = ext.hybridLogicAppSitesMap.get(subContext.subscriptionId);

    if (!logicAppsSites || !hybridLogicAppsSites) {
      const sites = await LogicAppResolver.getSubscriptionSites(context, subContext);
      return new Map([...sites.logicApps, ...(sites.hybridLogicApps as unknown as Map<string, Site>)]);
    }
    return new Map([...logicAppsSites, ...hybridLogicAppsSites]);
  }
}
