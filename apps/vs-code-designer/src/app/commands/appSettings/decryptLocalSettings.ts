/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import { executeCommand } from '../../utils/funcCoreTools/cpUtils';
import { getFunctionsCommand } from '../../utils/funcCoreTools/funcVersion';
import * as path from 'path';
import type { Uri } from 'vscode';

/**
 * Decrypts a local settings file using Azure Functions Core Tools.
 * @param {Uri} uri - Uri of local settings file.
 */
export async function decryptLocalSettings(uri: Uri): Promise<void> {
  ext.outputChannel.show(true);
  await executeCommand(ext.outputChannel, path.dirname(uri.fsPath), getFunctionsCommand(), 'settings', 'decrypt');
}
