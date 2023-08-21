/*------------------p---------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Platform, dependenciesPathSettingKey, dotnetDependencyName } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { downloadAndExtractBinaries, getCpuArchitecture, getDotNetBinariesReleaseUrl, getLatestDotNetVersion } from '../../utils/binaries';
import { getDotNetCommand } from '../../utils/dotnet/dotnet';
import { executeCommand } from '../../utils/funcCoreTools/cpUtils';
import { getGlobalSetting } from '../../utils/vsCodeConfig/settings';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

export async function installDotNet(context: IActionContext, majorVersion?: string): Promise<void> {
  ext.outputChannel.show();
  const arch = getCpuArchitecture();
  const targetDirectory = getGlobalSetting<string>(dependenciesPathSettingKey);

  const version = await getLatestDotNetVersion(context, majorVersion);
  let azureFunctionCoreToolsReleasesUrl;

  switch (process.platform) {
    case Platform.windows:
      azureFunctionCoreToolsReleasesUrl = getDotNetBinariesReleaseUrl(version, 'windows', arch);
      break;

    case Platform.linux:
      azureFunctionCoreToolsReleasesUrl = getDotNetBinariesReleaseUrl(version, 'linux', arch);
      break;

    case Platform.mac:
      azureFunctionCoreToolsReleasesUrl = getDotNetBinariesReleaseUrl(version, 'macos', arch);
      break;
  }
  downloadAndExtractBinaries(azureFunctionCoreToolsReleasesUrl, targetDirectory, dotnetDependencyName);

  executeCommand(ext.outputChannel, undefined, `${getDotNetCommand()}`, 'use', version);
}
