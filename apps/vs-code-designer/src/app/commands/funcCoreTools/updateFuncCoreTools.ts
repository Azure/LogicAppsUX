/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PackageManager, funcPackageName } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { executeCommand } from '../../utils/funcCoreTools/cpUtils';
import { getBrewPackageName, tryGetInstalledBrewPackageName } from '../../utils/funcCoreTools/getBrewPackageName';
import { getNpmDistTag } from '../../utils/funcCoreTools/getNpmDistTag';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { nonNullValue } from '@microsoft/vscode-azext-utils';
import type { FuncVersion, INpmDistTag } from '@microsoft/vscode-extension';

export async function updateFuncCoreTools(context: IActionContext, packageManager: PackageManager, version: FuncVersion): Promise<void> {
  ext.outputChannel.show();
  const distTag: INpmDistTag = await getNpmDistTag(context, version);

  switch (packageManager) {
    case PackageManager.npm: {
      await executeCommand(ext.outputChannel, undefined, 'npm', 'install', '-g', `${funcPackageName}@${distTag.tag}`);
      break;
    }
    case PackageManager.brew: {
      const brewPackageName: string = getBrewPackageName(version);
      const installedBrewPackageName: string = nonNullValue(await tryGetInstalledBrewPackageName(version), 'brewPackageName');
      if (brewPackageName !== installedBrewPackageName) {
        await executeCommand(ext.outputChannel, undefined, 'brew', 'uninstall', installedBrewPackageName);
        await executeCommand(ext.outputChannel, undefined, 'brew', 'install', brewPackageName);
      } else {
        await executeCommand(ext.outputChannel, undefined, 'brew', 'upgrade', brewPackageName);
      }
      break;
    }

    default: {
      throw new RangeError(localize('invalidPackageManager', 'Invalid package manager "{0}".', packageManager));
    }
  }
}
