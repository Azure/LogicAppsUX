/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { SlotTreeItemBase } from '../tree/slotsTree/SlotTreeItemBase';
import { startLogicApp } from './startLogicApp';
import { stopLogicApp } from './stopLogicApp';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

export async function restartLogicApp(context: IActionContext, node?: SlotTreeItemBase): Promise<void> {
  node = await stopLogicApp(context, node);
  await startLogicApp(context, node);
}
