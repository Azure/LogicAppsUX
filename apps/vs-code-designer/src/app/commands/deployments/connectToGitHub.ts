/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import { ProductionSlotTreeItem } from '../../tree/slotsTree/ProductionSlotTreeItem';
import { isSlotTreeItem } from '../../tree/slotsTree/SlotTreeItem';
import type { DeploymentsTreeItem } from '@microsoft/vscode-azext-azureappservice';
import { editScmType } from '@microsoft/vscode-azext-azureappservice';
import { ScmType } from '@microsoft/vscode-azext-azureappservice/out/src/ScmType';
import type { GenericTreeItem, IActionContext } from '@microsoft/vscode-azext-utils';

export async function connectToGitHub(context: IActionContext, target?: GenericTreeItem): Promise<void> {
  let node: ProductionSlotTreeItem | DeploymentsTreeItem;

  if (!target) {
    node = await ext.tree.showTreeItemPicker<ProductionSlotTreeItem>(ProductionSlotTreeItem.contextValue, context);
  } else {
    node = target.parent as DeploymentsTreeItem;
  }

  if (node && isSlotTreeItem(node)) {
    await editScmType(context, node.site, node.subscription, ScmType.GitHub);
  } else {
    throw Error('Internal error: Action not supported.');
  }

  if (node instanceof ProductionSlotTreeItem) {
    if (node.deploymentsNode) {
      await node.deploymentsNode.refresh(context);
    }
  } else {
    await node.parent?.refresh(context);
  }
}
