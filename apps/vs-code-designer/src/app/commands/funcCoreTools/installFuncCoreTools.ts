/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PackageManager, Platform, autoRuntimeDependenciesPathSettingKey, funcDependencyName, funcPackageName } from '../../../constants';
import { ext } from '../../../extensionVariables';
import {
  downloadAndExtractDependency,
  getCpuArchitecture,
  getFunctionCoreToolsBinariesReleaseUrl,
  getLatestFunctionCoreToolsVersion,
} from '../../utils/binaries';
import { executeCommand } from '../../utils/funcCoreTools/cpUtils';
import { getBrewPackageName } from '../../utils/funcCoreTools/getBrewPackageName';
import { getNpmDistTag } from '../../utils/funcCoreTools/getNpmDistTag';
import { getGlobalSetting, promptForFuncVersion } from '../../utils/vsCodeConfig/settings';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { FuncVersion, INpmDistTag } from '@microsoft/vscode-extension-logic-apps';
import { localize } from 'vscode-nls';

export async function installFuncCoreToolsBinaries(context: IActionContext, majorVersion?: string): Promise<void> {
  ext.outputChannel.show();
  const arch = getCpuArchitecture();
  const targetDirectory = getGlobalSetting<string>(autoRuntimeDependenciesPathSettingKey);
  context.telemetry.properties.lastStep = 'getLatestFunctionCoreToolsVersion';
  const version = await getLatestFunctionCoreToolsVersion(context, majorVersion);
  let azureFunctionCoreToolsReleasesUrl;

  context.telemetry.properties.lastStep = 'getFunctionCoreToolsBinariesReleaseUrl';
  switch (process.platform) {
    case Platform.windows:
      azureFunctionCoreToolsReleasesUrl = getFunctionCoreToolsBinariesReleaseUrl(version, 'win', arch);
      break;

    case Platform.linux:
      azureFunctionCoreToolsReleasesUrl = getFunctionCoreToolsBinariesReleaseUrl(version, 'linux', arch);
      break;

    case Platform.mac:
      azureFunctionCoreToolsReleasesUrl = getFunctionCoreToolsBinariesReleaseUrl(version, 'osx', arch);
      break;
  }
  context.telemetry.properties.lastStep = 'downloadAndExtractBinaries';
  await downloadAndExtractDependency(azureFunctionCoreToolsReleasesUrl, targetDirectory, funcDependencyName);
}

export async function installFuncCoreToolsSystem(
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
