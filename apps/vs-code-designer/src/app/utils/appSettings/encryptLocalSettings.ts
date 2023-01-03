/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { executeCommand } from '../../utils/funcCoreTools/cpUtils';
import { getLocalSettingsFile } from './getLocalSettingsFile';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as path from 'path';
import type { Uri } from 'vscode';

/**
 * Executes command to encrypt local settings file.
 * @param {IActionContext} context - Command context.
 * @param {Uri} uri - Uri of local settings file.
 */
export async function encryptLocalSettings(context: IActionContext, uri?: Uri): Promise<void> {
  const message: string = localize('selectLocalSettings', 'Select the settings file to encrypt.');
  const localSettingsPath: string = uri ? uri.fsPath : await getLocalSettingsFile(context, message);
  ext.outputChannel.show(true);
  await executeCommand(ext.outputChannel, path.dirname(localSettingsPath), 'func', 'settings', 'encrypt');
}
