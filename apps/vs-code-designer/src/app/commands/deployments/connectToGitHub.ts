/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { logicAppFilter } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { isSlotTreeItem } from '../../tree/slotsTree/SlotTreeItem';
import { editScmType, DeploymentsTreeItem } from '@microsoft/vscode-azext-azureappservice';
import { ScmType } from '@microsoft/vscode-azext-azureappservice/out/src/ScmType';
import type { GenericTreeItem, IActionContext } from '@microsoft/vscode-azext-utils';

export async function connectToGitHub(context: IActionContext, target?: GenericTreeItem): Promise<void> {
  let deployments: DeploymentsTreeItem;

  if (target) {
    deployments = target.parent as DeploymentsTreeItem;
  } else {
    deployments = await ext.rgApi.pickAppResource<DeploymentsTreeItem>(context, {
      filter: logicAppFilter,
      expectedChildContextValue: new RegExp(DeploymentsTreeItem.contextValueUnconnected),
    });
  }

  if (deployments.parent && isSlotTreeItem(deployments.parent)) {
    await editScmType(context, deployments.site, deployments.subscription, ScmType.GitHub);
    await deployments.refresh(context);
  } else {
    throw Error('Internal error: Action not supported.');
  }
}
