import type { Site } from '@azure/arm-appservice';
import { createWebSiteClient } from '@microsoft/vscode-azext-azureappservice';
import { uiUtils } from '@microsoft/vscode-azext-azureutils';
import type { IActionContext, ISubscriptionContext } from '@microsoft/vscode-azext-utils';
import { callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import type { AppResource, AppResourceResolver } from '@microsoft/vscode-azext-utils/hostapi';
import { LogicAppResourceTree } from './app/tree/LogicAppResourceTree';
import { logicAppFilter } from './constants';
import { ext } from './extensionVariables';

export class LogicAppResolver implements AppResourceResolver {
  private siteCacheLastUpdated = 0;
  private subscriptionSites: Map<string, Site> = new Map<string, Site>();
  private listLogicAppsTask: Promise<void> | undefined;

  public async resolveResource(subContext: ISubscriptionContext, resource: AppResource): Promise<LogicAppResourceTree | undefined> {
    return await callWithTelemetryAndErrorHandling('resolveResource', async (context: IActionContext) => {
      const site: Site = await this.getAppResourceSite(context, subContext, resource);
      if (!site) {
        return;
      }
      return LogicAppResourceTree.createLogicAppResourceTree(context, subContext, site);
    });
  }

  public matchesResource(resource: AppResource): boolean {
    return resource.type.toLowerCase() === logicAppFilter.type && resource.kind?.toLowerCase() === logicAppFilter.kind;
  }

  private async getSubscriptionSites(context: IActionContext, subContext: ISubscriptionContext, resource: any): Promise<Map<string, Site>> {
    const client = await createWebSiteClient({ ...context, ...subContext });

    if (this.siteCacheLastUpdated < Date.now() - 1000 * 3) {
      this.siteCacheLastUpdated = Date.now();
      this.listLogicAppsTask = new Promise((resolve, reject) => {
        this.subscriptionSites.clear();
        console.log('API CALL', resource);

        uiUtils
          .listAllIterator(client.webApps.list())
          .then((sites) => {
            for (const site of sites) {
              const workflowId = site.id.toLowerCase();
              this.subscriptionSites.set(workflowId, site);
            }
            ext.logicAppSitesMap.set(subContext.subscriptionId, this.subscriptionSites);
            resolve();
          })
          .catch((reason) => {
            reject(reason);
          });
      });
    }
    await this.listLogicAppsTask;
    return this.subscriptionSites;
  }

  private async getAppResourceSite(context: IActionContext, subContext: ISubscriptionContext, resource: AppResource): Promise<Site> {
    let site: Site;
    const workflowId = resource.id.toLowerCase();
    const logicAppsSites = ext.logicAppSitesMap.get(subContext.subscriptionId);

    if (logicAppsSites) {
      site = logicAppsSites.get(workflowId);
    } else {
      const subscriptionSites = await this.getSubscriptionSites(context, subContext, resource);
      site = subscriptionSites.get(workflowId);
    }
    return site;
  }

  public async getAppResourceSiteBySubscription(context: IActionContext, subContext: ISubscriptionContext): Promise<Map<string, Site>> {
    const logicAppsSites = ext.logicAppSitesMap.get(subContext.subscriptionId);

    if (!logicAppsSites) {
      return await this.getSubscriptionSites(context, subContext, 'sd');
    }
    return ext.logicAppSitesMap.get(subContext.subscriptionId);
  }
}
