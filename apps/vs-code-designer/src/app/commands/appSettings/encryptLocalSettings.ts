/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { extensionCommand } from '../../../constants';
import type { Uri } from 'vscode';
import { commands } from 'vscode';

/**
 * Executes command from functions extension to encrypt local settings file.
 * @param {Uri} uri - Uri of local settings file.
 */
export async function encryptLocalSettings(uri?: Uri): Promise<void> {
  await commands.executeCommand(extensionCommand.azureFunctionsAppSettingsEncrypt, uri);
}
