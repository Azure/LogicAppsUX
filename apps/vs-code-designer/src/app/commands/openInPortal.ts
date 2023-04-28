/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { logicAppFilter } from '../../constants';
import { ext } from '../../extensionVariables';
import { openInPortal as uiOpenInPortal } from '@microsoft/vscode-azext-azureutils';
import type { AzExtTreeItem, IActionContext } from '@microsoft/vscode-azext-utils';

export async function openInPortal(context: IActionContext, node?: AzExtTreeItem): Promise<void> {
  if (!node) {
    node = await ext.rgApi.pickAppResource<AzExtTreeItem>(context, {
      filter: logicAppFilter,
    });
  }

  await uiOpenInPortal(node, node.fullId);
}
