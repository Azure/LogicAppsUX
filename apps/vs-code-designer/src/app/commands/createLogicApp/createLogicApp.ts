/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import type { ProductionSlotTreeItem } from '../../tree/slotsTree/ProductionSlotTreeItem';
import { SubscriptionTreeItem } from '../../tree/subscriptionTree/SubscriptionTreeItem';
import { isString } from '@microsoft/utils-logic-apps';
import type { AzExtParentTreeItem, IActionContext } from '@microsoft/vscode-azext-utils';
import type { ICreateLogicAppContext } from '@microsoft/vscode-extension';

export async function createLogicApp(
  context: IActionContext & Partial<ICreateLogicAppContext>,
  subscription?: AzExtParentTreeItem | string,
  newResourceGroupName?: string
): Promise<string> {
  let node: AzExtParentTreeItem | undefined;
  if (isString(subscription)) {
    node = await ext.tree.findTreeItem(`/subscriptions/${subscription}`, context);
    if (!node) {
      throw new Error(localize('noMatchingSubscription', 'Failed to find a subscription matching id "{0}".', subscription));
    }
  } else if (!subscription) {
    node = await ext.tree.showTreeItemPicker<AzExtParentTreeItem>(SubscriptionTreeItem.contextValue, context);
  } else {
    node = subscription;
  }

  context.newResourceGroupName = newResourceGroupName;
  const funcAppNode: ProductionSlotTreeItem = await node.createChild(context);

  return funcAppNode.fullId;
}
