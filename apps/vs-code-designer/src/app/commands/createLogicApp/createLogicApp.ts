/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import type { SlotTreeItem } from '../../tree/slotsTree/SlotTreeItem';
import { SubscriptionTreeItem } from '../../tree/subscriptionTree/subscriptionTreeItem';
import { isString } from '@microsoft/logic-apps-shared';
import { callWithTelemetryAndErrorHandling, type AzExtParentTreeItem, type IActionContext } from '@microsoft/vscode-azext-utils';
import type { ICreateLogicAppContext, ILogicAppWizardContext } from '@microsoft/vscode-extension-logic-apps';
import { type MessageItem, window } from 'vscode';

/**
 * Creates a Logic App without showing wizard prompts - all required information must be provided in the context.
 * @param context - Context with pre-filled values (newSiteName, location, resourceGroup or newResourceGroupName)
 * @param subscription - Subscription ID or tree item
 * @param skipNotification - If true, skips the completion notification
 * @returns The created Logic App tree item
 */
export async function createLogicAppWithoutWizard(
  context: IActionContext & Partial<ICreateLogicAppContext> & { newSiteName: string; location: string },
  subscription: AzExtParentTreeItem | string,
  skipNotification?: boolean
): Promise<SlotTreeItem> {
  let node: AzExtParentTreeItem | undefined;

  if (isString(subscription)) {
    node = await ext.rgApi.appResourceTree.findTreeItem(`/subscriptions/${subscription}`, context);
    if (!node) {
      throw new Error(localize('noMatchingSubscription', 'Failed to find a subscription matching id "{0}".', subscription));
    }
  } else {
    node = subscription;
  }

  try {
    // Call the subscription tree item's createChild with a special flag to skip prompts
    const logicAppNode: SlotTreeItem = await SubscriptionTreeItem.createChildWithoutPrompts(
      context as unknown as ICreateLogicAppContext & ILogicAppWizardContext,
      node as SubscriptionTreeItem
    );

    if (!skipNotification) {
      await notifyCreateLogicAppComplete(logicAppNode);
    }

    // The node returned from creation may not have fully initialized fullId
    // Look it up from the tree to ensure all properties are correctly set
    const fullResourceId = `/subscriptions/${subscription}/resourceGroups/${context.newResourceGroupName ?? context.resourceGroup.name}/providers/Microsoft.Web/sites/${context.newSiteName}`;
    const refetchedLogicAppNode = (await ext.rgApi.appResourceTree.findTreeItem(fullResourceId, context as IActionContext)) as SlotTreeItem;

    return refetchedLogicAppNode;
  } catch (error) {
    throw new Error(`Error in creating logic app. ${error}`);
  }
}

export async function createLogicApp(
  context: IActionContext & Partial<ICreateLogicAppContext>,
  subscription?: AzExtParentTreeItem | string,
  nodesOrNewResourceGroupName?: string | (string | AzExtParentTreeItem)[]
): Promise<SlotTreeItem> {
  const newResourceGroupName = Array.isArray(nodesOrNewResourceGroupName) ? undefined : nodesOrNewResourceGroupName;
  let node: AzExtParentTreeItem | undefined;

  if (isString(subscription)) {
    node = await ext.rgApi.appResourceTree.findTreeItem(`/subscriptions/${subscription}`, context);
    if (!node) {
      throw new Error(localize('noMatchingSubscription', 'Failed to find a subscription matching id "{0}".', subscription));
    }
  } else if (subscription) {
    node = subscription;
  } else {
    node = await ext.rgApi.appResourceTree.showTreeItemPicker<AzExtParentTreeItem>(SubscriptionTreeItem.contextValue, context);
  }

  context.newResourceGroupName = newResourceGroupName;

  try {
    const logicAppNode: SlotTreeItem = await SubscriptionTreeItem.createChild(
      context as ICreateLogicAppContext,
      node as SubscriptionTreeItem
    );
    await notifyCreateLogicAppComplete(logicAppNode);
    return logicAppNode;
  } catch (error) {
    throw new Error(`Error in creating logic app. ${error}`);
  }
}

export async function createLogicAppAdvanced(
  context: IActionContext,
  subscription?: AzExtParentTreeItem | string,
  nodesOrNewResourceGroupName?: string | (string | AzExtParentTreeItem)[]
): Promise<SlotTreeItem> {
  return await createLogicApp({ ...context, advancedCreation: true }, subscription, nodesOrNewResourceGroupName);
}

/**
 * Shows information message after the creation of Logic app has been completed and let user select post actions.
 * @param {SlotTreeItem} node - Logic app node structure.
 */
async function notifyCreateLogicAppComplete(node: SlotTreeItem): Promise<void> {
  const deployComplete: string = localize(
    'creationComplete',
    'Creation of "{0}" completed.',
    node.isHybridLogicApp ? node.hybridSite.name : node.site.fullName
  );
  const viewOutput: MessageItem = { title: localize('viewOutput', 'View output') };

  window.showInformationMessage(deployComplete, viewOutput).then(async (result) => {
    await callWithTelemetryAndErrorHandling('postCreation', async (postDeployContext: IActionContext) => {
      postDeployContext.telemetry.properties.dialogResult = result && result.title;
      if (result === viewOutput) {
        ext.outputChannel.show();
      }
    });
  });
}
