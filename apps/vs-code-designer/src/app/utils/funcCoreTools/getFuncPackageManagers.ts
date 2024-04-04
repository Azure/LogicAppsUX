/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { funcPackageName, PackageManager, Platform } from '../../../constants';
import { executeCommand } from './cpUtils';
import { tryGetInstalledBrewPackageName } from './getBrewPackageName';
import { FuncVersion } from '@microsoft/vscode-extension-logic-apps';

/**
 * Gets package managers installed in the system.
 * @param {boolean} isFuncInstalled - Is functions core tools installed.
 * @returns {Promise<PackageManager[]>} Returns array of package managers.
 */
export async function getFuncPackageManagers(isFuncInstalled: boolean): Promise<PackageManager[]> {
  const result: PackageManager[] = [];
  switch (process.platform) {
    case Platform.linux:
      // https://github.com/Microsoft/vscode-azurefunctions/issues/311
      break;
    case Platform.mac:
      if (await hasBrew(isFuncInstalled)) {
        result.push(PackageManager.brew);
      }
    // fall through to check npm on both mac and windows
    default:
      try {
        isFuncInstalled
          ? await executeCommand(undefined, undefined, 'npm', 'ls', '-g', funcPackageName)
          : await executeCommand(undefined, undefined, 'npm', '--version');
        result.push(PackageManager.npm);
      } catch (error) {
        // an error indicates no npm
      }
  }
  return result;
}

/**
 * Checks if the system has brew installed.
 * @param {boolean} isFuncInstalled - Is functions core tools installed.
 * @returns {Promise<boolean>} Returns true if the system has brew installed, otherwise returns false.
 */
async function hasBrew(isFuncInstalled: boolean): Promise<boolean> {
  for (const version of Object.values(FuncVersion)) {
    if (version !== FuncVersion.v1) {
      if (isFuncInstalled) {
        const packageName: string | undefined = await tryGetInstalledBrewPackageName(version);
        if (packageName) {
          return true;
        }
      } else {
        try {
          await executeCommand(undefined, undefined, 'brew', '--version');
          return true;
        } catch (error) {
          // an error indicates no brew
        }
      }
    }
  }

  return false;
}
