/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { logicAppFilter } from '../../constants';
import { ext } from '../../extensionVariables';
import type { AzExtTreeItem, IActionContext } from '@microsoft/vscode-azext-utils';

export async function deleteNode(context: IActionContext, expectedContextValue: string | RegExp, node?: AzExtTreeItem): Promise<void> {
  if (!node) {
    node = await ext.rgApi.pickAppResource<AzExtTreeItem>(
      { ...context, suppressCreatePick: true },
      {
        filter: logicAppFilter,
        expectedChildContextValue: expectedContextValue,
      }
    );
  }

  await node.deleteTreeItem(context);
}
