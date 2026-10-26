/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { funcPackageName, PackageManager, type PackageManager as PackageManagerType } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { executeCommand } from '../../utils/funcCoreTools/cpUtils';
import { tryGetInstalledBrewPackageName } from '../../utils/funcCoreTools/getBrewPackageName';
import { getFuncPackageManagers } from '../../utils/funcCoreTools/getFuncPackageManagers';
import { tryGetLocalFuncVersion } from '../../utils/funcCoreTools/funcVersion';
import type { IActionContext, IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';

export async function uninstallFuncCoreTools(context: IActionContext, packageManagers?: PackageManagerType[]): Promise<void> {
  ext.outputChannel.show();
  packageManagers ??= await getFuncPackageManagers(true);

  let packageManager: PackageManagerType;
  if (packageManagers.length === 0) {
    throw new Error(
      localize(
        'funcCoreToolsNotInstalledByPackageManager',
        'Cannot uninstall Azure Functions Core Tools because it is not installed with npm or Homebrew.'
      )
    );
  }

  if (packageManagers.length === 1) {
    packageManager = packageManagers[0];
  } else {
    const picks: IAzureQuickPickItem<PackageManagerType>[] = packageManagers.map((manager) => ({
      label: localize('uninstallPackageManager', 'Uninstall {0} package', manager),
      data: manager,
    }));
    packageManager = (
      await context.ui.showQuickPick(picks, {
        placeHolder: localize(
          'selectFuncCoreToolsUninstall',
          'Multiple Functions Core Tools installations detected. Select one to uninstall.'
        ),
      })
    ).data;
  }

  switch (packageManager) {
    case PackageManager.npm:
      await executeCommand(ext.outputChannel, undefined, 'npm', 'uninstall', '-g', funcPackageName);
      break;
    case PackageManager.brew: {
      const version = await tryGetLocalFuncVersion();
      if (!version) {
        throw new Error(localize('funcCoreToolsVersionUnknown', 'Unable to determine the installed Azure Functions Core Tools version.'));
      }

      const packageName = await tryGetInstalledBrewPackageName(version);
      if (!packageName) {
        throw new Error(
          localize('funcCoreToolsBrewPackageNotFound', 'Unable to find an installed Homebrew package for Azure Functions Core Tools.')
        );
      }

      await executeCommand(ext.outputChannel, undefined, 'brew', 'uninstall', packageName);
      break;
    }
    default:
      throw new RangeError(localize('invalidPackageManager', 'Invalid package manager "{0}".', packageManager));
  }
}
