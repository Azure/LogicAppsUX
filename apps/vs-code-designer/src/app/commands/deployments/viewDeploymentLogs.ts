/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { logicAppFilter } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { DeploymentTreeItem } from '@microsoft/vscode-azext-azureappservice';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

export async function viewDeploymentLogs(context: IActionContext, node?: DeploymentTreeItem): Promise<void> {
  if (!node) {
    node = await ext.rgApi.pickAppResource<DeploymentTreeItem>(context, {
      filter: logicAppFilter,
      expectedChildContextValue: DeploymentTreeItem.contextValue,
    });
  }
  await node.viewDeploymentLogs(context);
}
