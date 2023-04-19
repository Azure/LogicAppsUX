/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { logicAppFilter } from '../../constants';
import { ext } from '../../extensionVariables';
import type { SlotTreeItem } from '../tree/slotsTree/SlotTreeItem';
import { editScmType } from '@microsoft/vscode-azext-azureappservice';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

export async function configureDeploymentSource(context: IActionContext, node?: SlotTreeItem): Promise<void> {
  if (!node) {
    node = await ext.rgApi.pickAppResource<SlotTreeItem>(context, {
      filter: logicAppFilter,
    });
  }

  const updatedScmType: string | undefined = await editScmType(context, node.site, node.subscription);
  if (updatedScmType !== undefined) {
    context.telemetry.properties.updatedScmType = updatedScmType;
  }
}
