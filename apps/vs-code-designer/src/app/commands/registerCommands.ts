/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { openDesigner } from './workflows/openDesigner';
import { commands } from 'vscode';

export function registerCommands(): void {
  // Register command "start"
  commands.registerCommand('logicAppsExtension.openDesigner', openDesigner);
}
