/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import { DeploymentTreeItem } from '@microsoft/vscode-azext-azureappservice';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

export async function redeployDeployment(context: IActionContext, node?: DeploymentTreeItem): Promise<void> {
  if (!node) {
    node = await ext.tree.showTreeItemPicker<DeploymentTreeItem>(DeploymentTreeItem.contextValue, context);
  }
  await node.redeployDeployment(context);
}
