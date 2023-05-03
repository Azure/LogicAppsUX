/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { logicAppFilter } from '../../constants';
import { ext } from '../../extensionVariables';
import { LogicAppResourceTree } from '../tree/LogicAppResourceTree';
import type { SlotTreeItem } from '../tree/slotsTree/SlotTreeItem';
import * as appservice from '@microsoft/vscode-azext-azureappservice';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

export async function swapSlot(context: IActionContext, sourceSlotNode?: SlotTreeItem): Promise<void> {
  if (!sourceSlotNode) {
    sourceSlotNode = await ext.rgApi.pickAppResource<SlotTreeItem>(
      { ...context, suppressCreatePick: true },
      {
        filter: logicAppFilter,
        expectedChildContextValue: new RegExp(LogicAppResourceTree.pickSlotContextValue),
      }
    );
  }

  const deploymentSlots: SlotTreeItem[] = (await sourceSlotNode.parent.getCachedChildren(context)) as SlotTreeItem[];
  await appservice.swapSlot(
    context,
    sourceSlotNode.site,
    deploymentSlots.map((ds) => ds.site)
  );
  await sourceSlotNode.parent.parent.refresh(context);
}
