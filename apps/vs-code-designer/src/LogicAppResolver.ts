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
  private subscriptionLogicApps: Map<string, Site> = new Map<string, Site>();
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

  /**
   * Determines if the given resource matches the specified logic app criteria.
   * @param resource - The resource to be checked.
   * @returns A boolean value indicating whether the resource matches the criteria.
   */
  public matchesResource(resource: AppResource): boolean {
    return resource.type.toLowerCase() === logicAppFilter.type && resource.kind?.toLowerCase() === logicAppFilter.kind;
  }

  /**
   * Retrieves the subscription logic apps for a given subscription.
   * @param context - The action context.
   * @param subContext - The subscription context.
   * @returns A Promise that resolves to a Map of subscription sites.
   */
  private async getSubscriptionLogicApps(context: IActionContext, subContext: ISubscriptionContext): Promise<Map<string, Site>> {
    const client = await createWebSiteClient({ ...context, ...subContext });

    if (this.siteCacheLastUpdated < Date.now() - 1000 * 3) {
      this.siteCacheLastUpdated = Date.now();
      this.listLogicAppsTask = new Promise((resolve, reject) => {
        this.subscriptionLogicApps.clear();
        uiUtils
          .listAllIterator(client.webApps.list())
          .then((sites) => {
            for (const site of sites) {
              const workflowId = site.id.toLowerCase();
              this.subscriptionLogicApps.set(workflowId, site);
            }
            ext.subscriptionLogicAppMap.set(subContext.subscriptionId, this.subscriptionLogicApps);
            resolve();
          })
          .catch((reason) => {
            reject(reason);
          });
      });
    }
    await this.listLogicAppsTask;
    return this.subscriptionLogicApps;
  }

  /**
   * Retrieves the Site associated with the given AppResource.
   *
   * @param context - The IActionContext object.
   * @param subContext - The ISubscriptionContext object.
   * @param resource - The AppResource object.
   * @returns A Promise that resolves to the Site associated with the AppResource.
   */
  private async getAppResourceSite(context: IActionContext, subContext: ISubscriptionContext, resource: AppResource): Promise<Site> {
    const workflowId = resource.id.toLowerCase();
    const logicAppMap = ext.subscriptionLogicAppMap.get(subContext.subscriptionId);

    if (logicAppMap) {
      return logicAppMap.get(workflowId);
    }
    const subscriptionSites = await this.getSubscriptionLogicApps(context, subContext);
    return subscriptionSites.get(workflowId);
  }

  /**
   * Retrieves the application resource site by subscription.
   *
   * @param context - The action context.
   * @param subContext - The subscription context.
   * @returns A promise that resolves to a map of logic app IDs and their corresponding sites.
   */
  public async getAppResourceSiteBySubscription(context: IActionContext, subContext: ISubscriptionContext): Promise<Map<string, Site>> {
    const logicAppMap = ext.subscriptionLogicAppMap.get(subContext.subscriptionId);

    if (logicAppMap) {
      return logicAppMap;
    }
    return await this.getSubscriptionLogicApps(context, subContext);
  }
}
