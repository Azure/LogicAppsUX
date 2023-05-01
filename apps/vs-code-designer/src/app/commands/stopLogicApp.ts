/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { logicAppFilter } from '../../constants';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import type { SlotTreeItem } from '../tree/slotsTree/SlotTreeItem';
import type { SiteClient } from '@microsoft/vscode-azext-azureappservice';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

export async function stopLogicApp(context: IActionContext, node?: SlotTreeItem): Promise<SlotTreeItem> {
  if (!node) {
    node = await ext.rgApi.pickAppResource<SlotTreeItem>(context, {
      filter: logicAppFilter,
    });
  }

  const client: SiteClient = await node.site.createClient(context);
  await node.runWithTemporaryDescription(context, localize('stopping', 'Stopping...'), async () => {
    await client.stop();
  });
  return node;
}
