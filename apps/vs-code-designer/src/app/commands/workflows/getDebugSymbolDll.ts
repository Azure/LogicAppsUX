/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isNullOrUndefined } from '@microsoft/logic-apps-shared';
import { debugSymbolDll } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { getFunctionsCommand } from '../../utils/funcCoreTools/funcVersion';
import * as cp from 'child_process';
import * as fse from 'fs-extra';
import * as path from 'path';

export async function getDebugSymbolDll(): Promise<string> {
  const bundleFolderRoot = await getExtensionBundleFolder();
  const bundleFolder = path.join(bundleFolderRoot, 'Microsoft.Azure.Functions.ExtensionBundle.Workflows');
  let bundleVersionNumber = '0.0.0';

  const bundleFolders = await fse.readdir(bundleFolder);
  if (bundleFolders.length === 0) {
    throw new Error(localize('bundleMissingError', 'Extension bundle could not be found.'));
  }

  for (const file of bundleFolders) {
    const filePath: string = path.join(bundleFolder, file);
    if (await (await fse.stat(filePath)).isDirectory()) {
      bundleVersionNumber = getMaxVersion(bundleVersionNumber, file);
    }
  }

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

/**
 * Compares and gets biggest extension bundle version.
 * @param version1 - Extension bundle version.
 * @param version2 - Extension bundle version.
 * @returns {string} Biggest extension bundle version.
 */
function getMaxVersion(version1, version2): string {
  let maxVersion = '';
  let arr1 = version1.split('.');
  let arr2 = version2.split('.');

  arr1 = arr1.map(Number);
  arr2 = arr2.map(Number);

  const arr1Size = arr1.length;
  const arr2Size = arr2.length;

  if (arr1Size > arr2Size) {
    for (let i = arr2Size; i < arr1Size; i++) {
      arr2.push(0);
    }
  } else {
    for (let i = arr1Size; i < arr2Size; i++) {
      arr1.push(0);
    }
  }

  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] > arr2[i]) {
      maxVersion = version1;
      break;
    }
    if (arr2[i] > arr1[i]) {
      maxVersion = version2;
      break;
    }
  }
  return maxVersion;
}
