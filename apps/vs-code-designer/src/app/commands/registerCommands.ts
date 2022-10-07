/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { openDesigner } from './workflows/openDesigner/openDesigner';
import { registerCommand } from '@microsoft/vscode-azext-utils';

export function registerCommands(): void {
  registerCommand('logicAppsExtension.openDesigner', openDesigner);
}
