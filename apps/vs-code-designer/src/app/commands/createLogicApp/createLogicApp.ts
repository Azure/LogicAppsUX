/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import type { SlotTreeItem } from '../../tree/slotsTree/SlotTreeItem';
import { SubscriptionTreeItem } from '../../tree/subscriptionTree/SubscriptionTreeItem';
import { notifyCreateLogicAppComplete } from './notifyCreateLogicAppComplete';
import { isString } from '@microsoft/utils-logic-apps';
import type { AzExtParentTreeItem, IActionContext } from '@microsoft/vscode-azext-utils';
import type { ICreateLogicAppContext } from '@microsoft/vscode-extension';

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
  } else if (!subscription) {
    node = await ext.rgApi.appResourceTree.showTreeItemPicker<AzExtParentTreeItem>(SubscriptionTreeItem.contextValue, context);
  } else {
    node = subscription;
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
