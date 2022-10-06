/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { openDesigner } from './workflows/openDesigner/openDesigner';
import { commands } from 'vscode';

export function registerCommands(): void {
  commands.registerCommand('logicAppsExtension.openDesigner', openDesigner);
}
