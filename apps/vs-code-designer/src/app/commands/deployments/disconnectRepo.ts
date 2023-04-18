/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { logicAppFilter } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { isLogicAppResourceTree } from '../../tree/LogicAppResourceTree';
import { DeploymentsTreeItem, disconnectRepo as disconnectRepository } from '@microsoft/vscode-azext-azureappservice';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

export async function disconnectRepo(context: IActionContext, node?: DeploymentsTreeItem): Promise<void> {
  if (!node) {
    node = await ext.rgApi.pickAppResource<DeploymentsTreeItem>(context, {
      filter: logicAppFilter,
      expectedChildContextValue: new RegExp(DeploymentsTreeItem.contextValueConnected),
    });
  }

  if (isLogicAppResourceTree(node.parent)) {
    await disconnectRepository(context, node.site, node.subscription);
    await node.refresh(context);
  } else {
    throw Error('Internal error: Action not supported.');
  }
}
