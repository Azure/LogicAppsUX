/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { SlotTreeItemBase } from '../../tree/slotsTree/SlotTreeItemBase';
import { isString } from '@microsoft/utils-logic-apps';
import type { AzExtTreeItem, IActionContext } from '@microsoft/vscode-azext-utils';
import type { Disposable, Uri } from 'vscode';

export interface IDeployNode {
  node: SlotTreeItemBase;
  isNewFunctionApp: boolean;
}

export async function getDeployNode(
  context: IActionContext,
  target: Uri | string | SlotTreeItemBase | undefined,
  functionAppId: string | Record<string, any> | undefined,
  expectedContextValue: string
): Promise<IDeployNode> {
  let node: SlotTreeItemBase | undefined;
  let isNewFunctionApp = false;

  if (target instanceof SlotTreeItemBase) {
    node = target;
  } else if (functionAppId && isString(functionAppId)) {
    node = await ext.tree.findTreeItem(functionAppId, context);
    if (!node) {
      throw new Error(localize('noMatchingFunctionApp', 'Failed to find a Logic App (Standard) matching id "{0}".', functionAppId));
    }
  } else {
    const newNodes: SlotTreeItemBase[] = [];
    const disposable: Disposable = ext.tree.onTreeItemCreate((newNode: SlotTreeItemBase) => {
      newNodes.push(newNode);
    });
    try {
      node = await ext.tree.showTreeItemPicker<SlotTreeItemBase>(expectedContextValue, context);
    } finally {
      disposable.dispose();
    }

    isNewFunctionApp = newNodes.some((newNode: AzExtTreeItem) => node && newNode.fullId === node.fullId);
  }

  context.telemetry.properties.isNewFunctionApp = String(isNewFunctionApp);
  return { node, isNewFunctionApp };
}
