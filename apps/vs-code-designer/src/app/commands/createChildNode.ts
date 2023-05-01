/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { logicAppFilter } from '../../constants';
import { ext } from '../../extensionVariables';
import type { AzExtParentTreeItem, IActionContext } from '@microsoft/vscode-azext-utils';

export async function createChildNode(
  context: IActionContext,
  expectedContextValue: string | RegExp,
  node?: AzExtParentTreeItem
): Promise<void> {
  if (!node) {
    node = await ext.rgApi.pickAppResource<AzExtParentTreeItem>(
      { ...context, suppressCreatePick: true },
      {
        filter: logicAppFilter,
        expectedChildContextValue: expectedContextValue,
      }
    );
  }

  await node.createChild(context);
}
