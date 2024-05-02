/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isNullOrUndefined } from '@microsoft/logic-apps-shared';
import { debugSymbolDll, extensionBundleId } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { getFunctionsCommand } from '../../utils/funcCoreTools/funcVersion';
import * as cp from 'child_process';
import * as path from 'path';
import { getLatestBundleVersion } from '../../utils/bundleFeed';

export async function getDebugSymbolDll(): Promise<string> {
  const bundleFolderRoot = await getExtensionBundleFolder();
  const bundleFolder = path.join(bundleFolderRoot, extensionBundleId);
  const bundleVersionNumber = await getLatestBundleVersion(bundleFolder);

  return path.join(bundleFolder, bundleVersionNumber, 'bin', debugSymbolDll);
}

/**
 * Gets extension bundle folder path.
 * @returns {string} Extension bundle folder path.
 */
export async function getExtensionBundleFolder(): Promise<string> {
  if (!isNullOrUndefined(ext.bundleFolderRoot)) {
    return ext.bundleFolderRoot;
  }
  const command = `${getFunctionsCommand()} GetExtensionBundlePath`;
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
  ext.bundleFolderRoot = extensionBundlePath;
  return extensionBundlePath;
}
