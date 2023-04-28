import { LogicAppResourceTree } from './app/tree/LogicAppResourceTree';
import { logicAppFilter } from './constants';
import { createWebSiteClient } from '@microsoft/vscode-azext-azureappservice';
import { getResourceGroupFromId } from '@microsoft/vscode-azext-azureutils';
import type { IActionContext, ISubscriptionContext } from '@microsoft/vscode-azext-utils';
import { callWithTelemetryAndErrorHandling, nonNullProp } from '@microsoft/vscode-azext-utils';
import type { AppResource, AppResourceResolver } from '@microsoft/vscode-azext-utils/hostapi';

export class LogicAppResolver implements AppResourceResolver {
  public async resolveResource(subContext: ISubscriptionContext, resource: AppResource): Promise<LogicAppResourceTree | undefined> {
    return await callWithTelemetryAndErrorHandling('resolveResource', async (context: IActionContext) => {
      const client = await createWebSiteClient({ ...context, ...subContext });
      const rg = getResourceGroupFromId(nonNullProp(resource, 'id'));
      const name = nonNullProp(resource, 'name');

      const site = await client.webApps.get(rg, name);
      return LogicAppResourceTree.createLogicAppResourceTree(context, subContext, site);
    });
  }

  public matchesResource(resource: AppResource): boolean {
    return resource.type.toLowerCase() === logicAppFilter.type && resource.kind?.toLowerCase() === logicAppFilter.kind;
  }
}
