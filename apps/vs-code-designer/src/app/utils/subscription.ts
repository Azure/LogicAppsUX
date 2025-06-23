/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { AzExtParentTreeItem, IActionContext, ISubscriptionContext } from '@microsoft/vscode-azext-utils';
import { ext } from '../../extensionVariables';
import { isString } from '@microsoft/logic-apps-shared';
import { localize } from '../../localize';
import { SubscriptionTreeItem } from '../tree/subscriptionTree/SubscriptionTreeItem';

/**
 * Retrieves the subscription context based on the provided subscription ID or prompts the user to select a subscription node.
 * @param {IActionContext} context - The action context.
 * @param {string} subscriptionId - Optional subscription ID to find the specific subscription node.
 * @returns {Promise<ISubscriptionContext>} - A promise that resolves to the found or selected node's subscription context.
 */
export async function getSubscriptionContext(context: IActionContext, subscriptionId?: string): Promise<ISubscriptionContext> {
  let node: AzExtParentTreeItem;

  if (isString(subscriptionId)) {
    node = await ext.rgApi.appResourceTree.findTreeItem(`/subscriptions/${subscriptionId}`, context);
    if (!node) {
      throw new Error(localize('noMatchingSubscription', 'Failed to find a subscription matching id "{0}".', subscriptionId));
    }
  } else {
    node = await ext.rgApi.appResourceTree.showTreeItemPicker<AzExtParentTreeItem>(SubscriptionTreeItem.contextValue, context);
  }

  return node.subscription;
}
