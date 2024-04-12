/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { funcPackageName } from '../../../constants';
import { executeCommand } from './cpUtils';
import { tryGetMajorVersion } from './funcVersion';
import { FuncVersion } from '@microsoft/vscode-extension-logic-apps';

/**
 * Gets functions core tools brew package name.
 * @param {FuncVersion} version - Package version.
 * @returns {string} Returns full package name for brew.
 */
export function getBrewPackageName(version: FuncVersion): string {
  return `${funcPackageName}@${tryGetMajorVersion(version)}`;
}

/**
 * Gets installed functions core tools brew package.
 * @param {FuncVersion} version - Package version.
 * @returns {Promise<string | undefined>} Returns installed full package name for brew.
 */
export async function tryGetInstalledBrewPackageName(version: FuncVersion): Promise<string | undefined> {
  const brewPackageName: string = getBrewPackageName(version);
  if (await isBrewPackageInstalled(brewPackageName)) {
    return brewPackageName;
  } else {
    let oldPackageName: string | undefined;
    if (version === FuncVersion.v2) {
      oldPackageName = funcPackageName;
    } else if (version === FuncVersion.v3) {
      oldPackageName = funcPackageName + '-v3-preview';
    }

    if (oldPackageName && (await isBrewPackageInstalled(oldPackageName))) {
      return oldPackageName;
    } else {
      return undefined;
    }
  }
}

/**
 * Checks if the package is installed via brew.
 * @param {string} packageName - Package name.
 * @returns {Promise<boolean>} Returns true if the package is installed, otherwise returns false.
 */
async function isBrewPackageInstalled(packageName: string): Promise<boolean> {
  try {
    await executeCommand(undefined, undefined, 'brew', 'ls', packageName);
    return true;
  } catch (error) {
    return false;
  }
}
