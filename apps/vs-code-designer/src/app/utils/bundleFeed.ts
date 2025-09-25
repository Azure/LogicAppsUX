/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../localize';
import { ext } from '../../extensionVariables';
import * as cp from 'child_process';

/**
 * Gets extension bundle folder path.
 * @returns {string} Extension bundle folder path.
 */
export async function getExtensionBundleFolder(): Promise<string> {
  const command = 'func GetExtensionBundlePath';
  const outputChannel = ext.outputChannel;

  if (outputChannel) {
    outputChannel.appendLog(localize('runningCommand', 'Running command: "{0}"...', command));
  }

  let extensionBundlePath = '';
  try {
    extensionBundlePath = await cp.execSync(command, { encoding: 'utf8' });
  } catch (error) {
    if (outputChannel) {
      outputChannel.appendLog(localize('bundleCommandError', 'Could not find path to extension bundle'));
      outputChannel.appendLog(JSON.stringify(error));
    }
    throw new Error(localize('bundlePathError', 'Could not find path to extension bundle.'));
  }

  extensionBundlePath = extensionBundlePath.trim().split('Microsoft.Azure.Functions.ExtensionBundle')[0];

  if (outputChannel) {
    outputChannel.appendLog(localize('extensionBundlePath', 'Extension bundle path: "{0}"...', extensionBundlePath));
  }
  return extensionBundlePath;
}
