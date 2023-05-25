/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PackageManager, Platform } from '../../../constants';
import { localize } from '../../../localize';
import { executeCommand } from '../funcCoreTools/cpUtils';
import { getDotNetSDKBrewPackageName } from '../packageManagers/getBrewPackageName';
import { hasBrew } from '../packageManagers/hasBrew';
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
    case Platform.linux:
      await executeCommand(undefined, undefined, 'sudo', 'wget', '--version');
      result.push(PackageManager.wget);
      break;
    case Platform.mac:
      if (await hasBrew(isDotNetSDKInstalled, getDotNetSDKBrewPackageName())) {
        result.push(PackageManager.brew);
      }
      break;
    case Platform.windows:
      try {
        isDotNetSDKInstalled
          ? await executeCommand(undefined, undefined, 'dotnet', '--version')
          : await executeCommand(undefined, undefined, 'winget', '--version');
        result.push(PackageManager.winget);
      } catch (error) {
        throw new Error(localize('noWinget', 'Failed to verify winget install'));
      }
      return result;
  }
}
