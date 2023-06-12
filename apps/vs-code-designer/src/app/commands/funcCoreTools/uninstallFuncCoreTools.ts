/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { extensionCommand, PackageManager, wingetFuncPackageName } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { executeCommand } from '../../utils/funcCoreTools/cpUtils';
import { getGlobalSetting } from '../../utils/vsCodeConfig/settings';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { commands } from 'vscode';

export async function uninstallFuncCoreTools(context: IActionContext, packageManagers?: PackageManager[]): Promise<void> {
  context.telemetry.properties.uninstallFuncCoreTools = 'true';

  if (context.telemetry.properties.multiFunc) {
    // azureFunctionsUninstallFuncCoreTools only supports brew/npm
    // Remove winget from PackageManagers
    // This does not give users the choice
    packageManagers.splice(packageManagers.indexOf(PackageManager.winget), 1);
  }

  let packageManager = packageManagers ? packageManagers[0] : null;
  if (packageManager == undefined || packageManager == null) {
    const platformPackageManagerKey = 'PlatformPackageManager';
    packageManager = getGlobalSetting(platformPackageManagerKey);
    context.telemetry.properties.packageManager = packageManager;
  }

  switch (packageManager) {
    case PackageManager.winget:
      await executeCommand(ext.outputChannel, undefined, 'winget', 'uninstall', '--silent', `${wingetFuncPackageName}`);
      break;
    case PackageManager.brew:
    case PackageManager.npm:
      await commands.executeCommand(extensionCommand.azureFunctionsUninstallFuncCoreTools, packageManagers);
      break;
    default:
      throw new RangeError(localize('invalidPackageManager', 'Invalid package manager "{0}".', packageManagers[0]));
  }
}
