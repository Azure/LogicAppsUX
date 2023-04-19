/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../extensionVariables';
import { LogicAppResourceTree } from '../tree/LogicAppResourceTree';
import type { SlotTreeItem } from '../tree/slotsTree/SlotTreeItem';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { openReadOnlyJson } from '@microsoft/vscode-azext-utils';

export async function viewProperties(context: IActionContext, node?: SlotTreeItem): Promise<void> {
  if (!node) {
    node = await ext.rgApi.appResourceTree.showTreeItemPicker<SlotTreeItem>(LogicAppResourceTree.productionContextValue, context);
  }

  const data = node.site;

  await openReadOnlyJson(node, data);
}
