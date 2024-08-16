import { LogicAppResourceTree } from './app/tree/LogicAppResourceTree';
import { logicAppFilter } from './constants';
import { ext } from './extensionVariables';
import type { Site } from '@azure/arm-appservice';
import { createWebSiteClient } from '@microsoft/vscode-azext-azureappservice';
import { uiUtils } from '@microsoft/vscode-azext-azureutils';
import type { IActionContext, ISubscriptionContext } from '@microsoft/vscode-azext-utils';
import { callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import type { AppResource, AppResourceResolver } from '@microsoft/vscode-azext-utils/hostapi';

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

  static async getSubscriptionSites(context: IActionContext, subContext: ISubscriptionContext): Promise<Map<string, Site>> {
    const client = await createWebSiteClient({ ...context, ...subContext });

    const listOfSites: Site[] = await uiUtils.listAllIterator(client.webApps.list());
    const subscriptionSites = new Map<string, Site>();

    listOfSites.forEach((item: Site) => {
      const workflowId = item.id.toLowerCase();
      subscriptionSites.set(workflowId, item);
    });

    ext.logicAppSitesMap.set(subContext.subscriptionId, subscriptionSites);
    return subscriptionSites;
  }

  static async getAppResourceSite(context: IActionContext, subContext: ISubscriptionContext, resource: AppResource): Promise<Site> {
    const logicAppsSites = ext.logicAppSitesMap.get(subContext.subscriptionId);
    let site: Site;
    const workflowId = resource.id.toLowerCase();

    if (logicAppsSites) {
      site = logicAppsSites.get(workflowId);
    } else {
      const subscriptionSites = await LogicAppResolver.getSubscriptionSites(context, subContext);
      site = subscriptionSites.get(workflowId);
    }
    return site;
  }

  static async getAppResourceSiteBySubscription(context: IActionContext, subContext: ISubscriptionContext): Promise<Map<string, Site>> {
    const logicAppsSites = ext.logicAppSitesMap.get(subContext.subscriptionId);

    if (!logicAppsSites) {
      return await LogicAppResolver.getSubscriptionSites(context, subContext);
    }
    return ext.logicAppSitesMap.get(subContext.subscriptionId);
  }
}
