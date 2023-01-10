/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { funcPackageName, PackageManager } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { executeCommand } from '../../utils/funcCoreTools/cpUtils';
import { getBrewPackageName } from '../../utils/funcCoreTools/getBrewPackageName';
import { getNpmDistTag } from '../../utils/funcCoreTools/getNpmDistTag';
import { promptForFuncVersion } from '../../utils/vsCodeConfig/settings';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { FuncVersion, INpmDistTag } from '@microsoft/vscode-extension';

export async function installFuncCoreTools(
  context: IActionContext,
  packageManagers: PackageManager[],
  version?: FuncVersion
): Promise<void> {
  version = version || (await promptForFuncVersion(context, localize('selectVersion', 'Select the version of the runtime to install')));

  ext.outputChannel.show();

  const distTag: INpmDistTag = await getNpmDistTag(context, version);
  const brewPackageName: string = getBrewPackageName(version);

  switch (packageManagers[0]) {
    case PackageManager.npm:
      await executeCommand(ext.outputChannel, undefined, 'npm', 'install', '-g', `${funcPackageName}@${distTag.tag}`);
      break;
    case PackageManager.brew:
      await executeCommand(ext.outputChannel, undefined, 'brew', 'tap', 'azure/functions');
      await executeCommand(ext.outputChannel, undefined, 'brew', 'install', brewPackageName);
      break;
    default:
      throw new RangeError(localize('invalidPackageManager', 'Invalid package manager "{0}".', packageManagers[0]));
  }
}
