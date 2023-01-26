/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../extensionVariables';
import { ProductionSlotTreeItem } from '../tree/slotsTree/ProductionSlotTreeItem';
import type { SlotTreeItemBase } from '../tree/slotsTree/SlotTreeItemBase';
import { editScmType } from '@microsoft/vscode-azext-azureappservice';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

export async function configureDeploymentSource(context: IActionContext, node?: SlotTreeItemBase): Promise<void> {
  if (!node) {
    node = await ext.tree.showTreeItemPicker<SlotTreeItemBase>(ProductionSlotTreeItem.contextValue, context);
  }

  const updatedScmType: string | undefined = await editScmType(context, node.site, node.subscription);
  if (updatedScmType !== undefined) {
    context.telemetry.properties.updatedScmType = updatedScmType;
  }
}
