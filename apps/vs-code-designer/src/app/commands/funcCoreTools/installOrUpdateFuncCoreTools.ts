/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { extensionCommand, wingetFuncPackageName, PackageManager } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { executeOnFunctions } from '../../functionsExtension/executeOnFunctionsExt';
import { executeCommand } from '../../utils/funcCoreTools/cpUtils';
import { getGlobalSetting } from '../../utils/vsCodeConfig/settings';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

export async function installOrUpdateFuncCoreTools(context: IActionContext, packageManagers: PackageManager[]): Promise<void> {
  ext.outputChannel.show();
  context.telemetry.properties.installOrUpdateFuncCoreTools = 'true';

  let packageManager = packageManagers ? packageManagers[0] : null;
  if (packageManager == undefined || packageManager == null) {
    const platformPackageManagerKey = 'PlatformPackageManager';
    packageManager = getGlobalSetting(platformPackageManagerKey);
    context.telemetry.properties.packageManager = packageManager;
  }

  switch (packageManager) {
    case PackageManager.winget:
      await executeCommand(ext.outputChannel, undefined, 'winget', 'install', '--silent', `${wingetFuncPackageName}`);
      break;
    case PackageManager.brew:
    case PackageManager.npm:
      await executeOnFunctions(extensionCommand.azureFunctionsInstallOrUpdateFuncCoreTools, context);
      break;
    default:
      throw new RangeError(localize('invalidPackageManager', 'Invalid package manager "{0}".', packageManager));
  }
}
