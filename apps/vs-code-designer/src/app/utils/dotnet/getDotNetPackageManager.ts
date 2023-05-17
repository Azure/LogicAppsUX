/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PackageManager } from '../../../constants';
import { executeCommand } from '../funcCoreTools/cpUtils';
import { tryGetInstalledBrewPackageName } from './getBrewPackageName';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

/**
 * Gets package managers installed in the system.
 * @param {boolean} isDotNetSDKInstalled - Is dot net sdk installed.
 * @returns {Promise<PackageManager[]>} Returns array of package managers.
 */
export async function getDotNetPackageManager(context: IActionContext, isDotNetSDKInstalled: boolean): Promise<PackageManager[]> {
  const result: PackageManager[] = [];

  context.telemetry.properties.getDotNetPackageManager = 'true';

  switch (process.platform) {
    case 'linux':
      // https://learn.microsoft.com/en-us/dotnet/core/install/linux-scripted-manual
      break;
    case 'darwin':
      if (await hasBrew(isDotNetSDKInstalled)) {
        result.push(PackageManager.brew);
      }
    // fall through to check npm on both mac and windows
    case 'win32':
      try {
        isDotNetSDKInstalled
          ? await executeCommand(undefined, undefined, 'dotnet', '--version')
          : await executeCommand(undefined, undefined, 'winget', '--version');
        result.push(PackageManager.winget);
      } catch (error) {
        // an error indicates no winget (Pre-Windows 10)
      }
      return result;
  }
}

/**
 * Checks if the system has brew installed.
 * @param {boolean} isDotNetSDKInstalled - Is .NET SDK Installed.
 * @returns {Promise<boolean>} Returns true if the system has brew installed, otherwise returns false.
 */
async function hasBrew(isDotNetSDKInstalled: boolean): Promise<boolean> {
  if (isDotNetSDKInstalled) {
    const packageName: string | undefined = await tryGetInstalledBrewPackageName();
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

  return false;
}
