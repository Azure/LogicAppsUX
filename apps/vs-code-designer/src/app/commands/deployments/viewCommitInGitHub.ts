/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { logicAppFilter } from '../../../constants';
import { ext } from '../../../extensionVariables';
import type { DeploymentTreeItem } from '@microsoft/vscode-azext-azureappservice';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

export async function viewCommitInGitHub(context: IActionContext, node?: DeploymentTreeItem): Promise<void> {
  if (!node) {
    node = await ext.rgApi.pickAppResource<DeploymentTreeItem>(context, {
      filter: logicAppFilter,
      expectedChildContextValue: 'deployment/github',
    });
  }
  await node.viewCommitInGitHub(context);
}
