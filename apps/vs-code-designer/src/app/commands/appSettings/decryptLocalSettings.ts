/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { extensionCommand } from '../../../constants';
import { commands, type Uri } from 'vscode';

/**
 * Executes command to decrypt local settings file.
 * @param {IActionContext} context - Command context.
 * @param {Uri} uri - Uri of local settings file.
 */
export async function decryptLocalSettings(uri?: Uri): Promise<void> {
  await commands.executeCommand(extensionCommand.azureFunctionsAppSettingsDecrypt, uri);
}
