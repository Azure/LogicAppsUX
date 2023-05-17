/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { dotnet, dotNetSDKMajorVersion } from '../../../constants';
import { executeCommand } from '../funcCoreTools/cpUtils';

/**
 * Gets .NET SDK brew package name.
 * @returns {string} Returns full package name for brew.
 */
export function getBrewPackageName(): string {
  return `${dotnet}@${dotNetSDKMajorVersion}`;
}

/**
 * Gets installed dot net sdk brew package.
 * @returns {Promise<string | undefined>} Returns installed full package name for brew.
 */
const brewPackageName: string = getBrewPackageName();
export async function tryGetInstalledBrewPackageName(): Promise<string | undefined> {
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
