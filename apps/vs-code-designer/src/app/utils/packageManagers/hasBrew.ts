/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../localize';
import { executeCommand } from '../funcCoreTools/cpUtils';
import { tryGetInstalledBrewPackageName } from './getBrewPackageName';

/**
 * Checks if the system has brew installed.
 * @param {boolean} isPackageInstalled - Is package Installed.
 * * @param {string} brewPackageName - Brew Package Name.
 * @returns {Promise<boolean>} Returns true if the system has brew installed, otherwise returns false.
 */
export async function hasBrew(isDotNetSDKInstalled: boolean, brewPackageName: string): Promise<boolean> {
  if (isDotNetSDKInstalled) {
    const packageName: string | undefined = await tryGetInstalledBrewPackageName(brewPackageName);
    if (packageName) {
      return true;
    }
  } else {
    try {
      await executeCommand(undefined, undefined, 'brew', '--version');
      return true;
    } catch (error) {
      throw new Error(localize('noBrew', 'Failed to verify Brew install'));
    }
  }

  return false;
}
