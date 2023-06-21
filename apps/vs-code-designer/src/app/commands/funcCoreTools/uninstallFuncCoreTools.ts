/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PackageManager, wingetFuncPackageName, funcPackageName } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { executeCommand } from '../../utils/funcCoreTools/cpUtils';
import { tryGetLocalFuncVersion } from '../../utils/funcCoreTools/funcVersion';
import { tryGetInstalledFuncCoreToolsBrewPackageName } from '../../utils/packageManagers/getBrewPackageName';
import { getGlobalSetting } from '../../utils/vsCodeConfig/settings';
import type { IActionContext, IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import type { FuncVersion } from '@microsoft/vscode-extension';

export async function uninstallFuncCoreTools(context: IActionContext, packageManagers?: PackageManager[]): Promise<void> {
  context.telemetry.properties.uninstallFuncCoreTools = 'true';

  let packageManager = packageManagers ? packageManagers[0] : null;
  if (packageManager == undefined || packageManager == null) {
    const platformPackageManagerKey = 'PlatformPackageManager';
    packageManager = getGlobalSetting(platformPackageManagerKey);
    context.telemetry.properties.packageManager = packageManager;
  }

  if (packageManagers && packageManagers.length === 0) {
    throw new Error(
      localize('notInstalled', 'Cannot uninstall Azure Functions Core Tools because it is not installed with supported package manager.')
    );
  } else if (packageManagers && packageManagers.length > 1 && context.telemetry.properties.multiFunc) {
    const placeHolder: string = localize('multipleInstalls', 'Multiple installs of the func cli detected. Select the one to uninstall');
    const picks: IAzureQuickPickItem<PackageManager>[] = packageManagers.map((pm) => {
      return { label: localize('uninstall', 'Uninstall {0} package', pm), data: pm };
    });
    packageManager = (await context.ui.showQuickPick(picks, { placeHolder, stepName: 'multipleFuncInstalls' })).data;
    context.telemetry.properties.packageManager = packageManager;
  }

  switch (packageManager) {
    case PackageManager.npm:
      await executeCommand(ext.outputChannel, undefined, 'npm', 'uninstall', '-g', funcPackageName);
      break;
    case PackageManager.brew: {
      const version: FuncVersion = await tryGetLocalFuncVersion();
      const brewPackageName: string = await tryGetInstalledFuncCoreToolsBrewPackageName(version);
      await executeCommand(ext.outputChannel, undefined, 'brew', 'uninstall', brewPackageName);
      break;
    }
    case PackageManager.winget:
      await executeCommand(ext.outputChannel, undefined, 'winget', 'uninstall', '--silent', wingetFuncPackageName);
      break;
    default:
      throw new RangeError(localize('invalidPackageManager', 'Invalid package manager "{0}".', packageManagers[0]));
  }
}
