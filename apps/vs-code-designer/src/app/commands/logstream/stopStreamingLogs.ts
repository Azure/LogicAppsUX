/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { logicAppFilter } from '../../../constants';
import { ext } from '../../../extensionVariables';
import type { SlotTreeItem } from '../../tree/slotsTree/SlotTreeItem';
import * as appservice from '@microsoft/vscode-azext-azureappservice';
import type { ParsedSite } from '@microsoft/vscode-azext-azureappservice';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

export async function stopStreamingLogs(context: IActionContext, node?: SlotTreeItem): Promise<void> {
  if (!node) {
    node = await ext.rgApi.pickAppResource<SlotTreeItem>(
      { ...context, suppressCreatePick: true },
      {
        filter: logicAppFilter,
      }
    );
  }

  const site: ParsedSite = node.site;
  await appservice.stopStreamingLogs(site, node.logStreamPath);
}
