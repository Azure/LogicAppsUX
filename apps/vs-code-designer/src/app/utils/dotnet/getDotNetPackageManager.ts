/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PackageManager } from '../../../constants';
import { executeCommand } from '../funcCoreTools/cpUtils';
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
