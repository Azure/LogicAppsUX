import {
  type AzExtParentTreeItem,
  AzureWizardPromptStep,
  type IActionContext,
  type IAzureQuickPickItem,
  type ISubscriptionContext,
} from '@microsoft/vscode-azext-utils';
import type { IAzureDeploymentScriptsContext } from '../../generateDeploymentScripts';
import { localize } from '../../../../../localize';
import { ext } from '../../../../../extensionVariables';
import { createContainerClient } from '../../../../utils/azureClients';
import { LogicAppResourceTree } from '../../../../tree/LogicAppResourceTree';
import { SlotTreeItem } from '../../../../tree/slotsTree/SlotTreeItem';
import type { Site } from '@azure/arm-appservice';
import { LogicAppResolver } from '../../../../../LogicAppResolver';

export class LogicAppStep extends AzureWizardPromptStep<IAzureDeploymentScriptsContext> {
  public hideStepCount = true;

  public async prompt(context: IAzureDeploymentScriptsContext): Promise<void> {
    const placeHolder: string = localize('selectLogicApp', 'Select Logic App (Standard) in Azure');
    const subscriptionNode = await ext.rgApi.appResourceTree.findTreeItem(`/subscriptions/${context.subscriptionId}`, context);
    if (!subscriptionNode) {
      throw new Error(localize('noMatchingSubscription', 'Failed to find a subscription matching id "{0}".', context.subscriptionId));
    }

    let site = (await context.ui.showQuickPick(LogicAppStep.getLogicAppsPicks(context, subscriptionNode.subscription), { placeHolder }))
      .data;

    if (site.id.includes('Microsoft.App')) {
      // NOTE(anandgmenon): Getting latest metadata for hybrid app as the one loaded from the cache can have outdated definition and cause deployment to fail.
      const clientContainer = await createContainerClient({ ...context, ...subscriptionNode.subscription });
      site = (await clientContainer.containerApps.get(site.id.split('/')[4], site.name)) as undefined as Site;
    }
    const resourceTree = new LogicAppResourceTree(subscriptionNode.subscription, site);

    context.logicAppNode = new SlotTreeItem(subscriptionNode as AzExtParentTreeItem, resourceTree);
    context.logicAppName = context.logicAppNode.site.siteName;
  }

  public shouldPrompt(): boolean {
    return true;
  }

  private static async getLogicAppsPicks(context: IActionContext, subContext: ISubscriptionContext): Promise<IAzureQuickPickItem<Site>[]> {
    const logicAppsResolver = new LogicAppResolver();
    const sites = await logicAppsResolver.getAppResourceSiteBySubscription(context, subContext);
    const picks: { label: string; data: Site; description?: string }[] = [];

    Array.from(sites.logicApps).forEach(([_id, site]) => {
      picks.push({ label: site.name, data: site });
    });

    Array.from(sites.hybridLogicApps).forEach(([_id, site]) => {
      picks.push({ label: `${site.name} (Hybrid)`, data: site as unknown as Site });
    });

    picks.sort((a, b) => a.label.localeCompare(b.label));

    return picks;
  }
}
