/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { dotNetSDKMajorVersion } from '../../../constants';
import { dotNetPackageName } from '../../../constants';
import { executeCommand } from '../funcCoreTools/cpUtils';

/**
 * Gets functions core tools brew package name.
 * @returns {string} Returns full package name for brew.
 */
export function getBrewPackageName(): string {
  return `${dotNetPackageName}@${dotNetSDKMajorVersion}`;
}

/**
 * Gets installed functions core tools brew package.
 * @returns {Promise<string | undefined>} Returns installed full package name for brew.
 */
export async function tryGetInstalledBrewPackageName(): Promise<string | undefined> {
  const brewPackageName: string = getBrewPackageName();
  if (await isBrewPackageInstalled(brewPackageName)) {
    return brewPackageName;
  }
  return undefined;
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
