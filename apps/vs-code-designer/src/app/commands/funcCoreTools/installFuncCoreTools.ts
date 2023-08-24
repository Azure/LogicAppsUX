/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Platform, dependenciesPathSettingKey, funcDependencyName } from '../../../constants';
import { ext } from '../../../extensionVariables';
import {
  downloadAndExtractBinaries,
  getCpuArchitecture,
  getFunctionCoreToolsBinariesReleaseUrl,
  getLatestFunctionCoreToolsVersion,
} from '../../utils/binaries';
import { setFunctionsCommand } from '../../utils/funcCoreTools/funcVersion';
import { getGlobalSetting } from '../../utils/vsCodeConfig/settings';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

export async function installFuncCoreTools(context: IActionContext, majorVersion?: string): Promise<void> {
  ext.outputChannel.show();
  const arch = getCpuArchitecture();
  const targetDirectory = getGlobalSetting<string>(dependenciesPathSettingKey);

  const version = await getLatestFunctionCoreToolsVersion(context, majorVersion);
  let azureFunctionCoreToolsReleasesUrl;

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

  await downloadAndExtractBinaries(azureFunctionCoreToolsReleasesUrl, targetDirectory, funcDependencyName);
  await setFunctionsCommand();
}
