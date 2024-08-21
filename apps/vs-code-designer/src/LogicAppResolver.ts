import { LogicAppResourceTree } from './app/tree/LogicAppResourceTree';
import { logicAppFilter } from './constants';
import { ext } from './extensionVariables';
import type { Site } from '@azure/arm-appservice';
import { createWebSiteClient } from '@microsoft/vscode-azext-azureappservice';
import { uiUtils } from '@microsoft/vscode-azext-azureutils';
import type { IActionContext, ISubscriptionContext } from '@microsoft/vscode-azext-utils';
import { callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import type { AppResource, AppResourceResolver } from '@microsoft/vscode-azext-utils/hostapi';
import type { ContainerApp } from '@azure/arm-appcontainers';
import { ResourceGraphClient } from '@azure/arm-resourcegraph';

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
    const resourceGraphClient = new ResourceGraphClient(subContext.credentials);

    const [listOfSites, listOfContainerSites] = await Promise.all([
      uiUtils.listAllIterator(client.webApps.list()),
      // TODO update to (type =~ 'microsoft.app/containerApps' and kind contains 'workflowapp') when the API is updated
      resourceGraphClient.resources({
        query: 'resources | where type =~ "microsoft.app/containerApps"',
        subscriptions: [subContext.subscriptionId],
      }),
    ]);

    const listOfHybridSites = listOfContainerSites.data.filter(
      (site) => site.properties.managedEnvironmentId === null && site.extendedLocation
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
      return await LogicAppResolver.getSubscriptionSites(context, subContext);
    }
    return {
      logicApps: logicAppsSites,
      hybridLogicApps: hybridLogicAppsSites,
    };
  }
}
