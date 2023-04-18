/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { logicAppFilter } from '../../constants';
import { ext } from '../../extensionVariables';
import type { SlotTreeItem } from '../tree/slotsTree/SlotTreeItem';
import type { SlotTreeItemBase } from '../tree/slotsTree/SlotTreeItemBase';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { openUrl } from '@microsoft/vscode-azext-utils';

export async function browseWebsite(context: IActionContext, node?: SlotTreeItemBase): Promise<void> {
  if (!node) {
    node = await ext.rgApi.pickAppResource<SlotTreeItem>(context, {
      filter: logicAppFilter,
    });
  }

  await openUrl(node.site.defaultHostUrl);
}
