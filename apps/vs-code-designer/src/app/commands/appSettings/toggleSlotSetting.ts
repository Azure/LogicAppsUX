/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { logicAppFilter } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { AppSettingTreeItem } from '@microsoft/vscode-azext-azureappservice';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

export async function toggleSlotSetting(context: IActionContext, node?: AppSettingTreeItem): Promise<void> {
  if (!node) {
    node = await ext.rgApi.pickAppResource<AppSettingTreeItem>(context, {
      filter: logicAppFilter,
      expectedChildContextValue: new RegExp(AppSettingTreeItem.contextValue),
    });
  }

  await node.toggleSlotSetting(context);
}
