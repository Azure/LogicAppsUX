/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { funcPackageName, PackageManager, Platform, wingetFuncPackageName } from '../../../constants';
import { tryGetInstalledBrewPackageName } from '../packageManagers/getBrewPackageName';
import { executeCommand } from './cpUtils';
import { FuncVersion } from '@microsoft/vscode-extension';

/**
 * Gets package managers installed in the system.
 * Determines which package manager installed functions core tools.
 * @param {boolean} isFuncInstalled - Is functions core tools installed.
 * @returns {Promise<PackageManager[]>} Returns array of package managers.
 */
export async function getFuncPackageManagers(isFuncInstalled: boolean): Promise<PackageManager[]> {
  const result: PackageManager[] = [];
  if (isFuncInstalled) {
    if (process.platform == Platform.windows) {
      const response = await executeCommand(undefined, undefined, 'winget', 'list', wingetFuncPackageName);
      // winget response includes headers if package is installed
      if (response.length > 2) {
        result.push(PackageManager.winget);
      }
    }

    if (process.platform == Platform.mac) {
      if (hasBrew(isFuncInstalled)) {
        result.push(PackageManager.brew);
      }
    }
    // https://github.com/Microsoft/vscode-azurefunctions/issues/311
    // fall through to check npm on windows, mac and linux
    try {
      await executeCommand(undefined, undefined, 'npm', 'ls', '-g', funcPackageName);
      result.push(PackageManager.npm);
    } catch (error) {
      // an error indicates no npm
    }
  } else {
    if (process.platform == Platform.windows) {
      result.push(PackageManager.winget);
    }

    if (process.platform == Platform.mac) {
      if (hasBrew(isFuncInstalled)) {
        result.push(PackageManager.brew);
      }
    }

    if (process.platform == Platform.linux) {
      // https://github.com/Microsoft/vscode-azurefunctions/issues/311
      result.push(PackageManager.wget);
    }

    // fall through to check npm on windows, mac and linux
    try {
      await executeCommand(undefined, undefined, 'npm', '-v');
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
