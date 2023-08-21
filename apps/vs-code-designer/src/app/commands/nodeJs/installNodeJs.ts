/*------------------p---------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Platform, dependenciesPathSettingKey, nodeJsDependencyName } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { downloadAndExtractBinaries, getCpuArchitecture, getLatestNodeJsVersion, getNodeJsBinariesReleaseUrl } from '../../utils/binaries';
import { getGlobalSetting } from '../../utils/vsCodeConfig/settings';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

export async function installNodeJs(context: IActionContext, majorVersion?: string): Promise<void> {
  ext.outputChannel.show();
  const arch = getCpuArchitecture();
  const targetDirectory = getGlobalSetting<string>(dependenciesPathSettingKey);

  const version = await getLatestNodeJsVersion(context, majorVersion);
  let azureFunctionCoreToolsReleasesUrl;

  switch (process.platform) {
    case Platform.windows:
      azureFunctionCoreToolsReleasesUrl = getNodeJsBinariesReleaseUrl(version, 'win', arch);
      break;

    case Platform.linux:
      azureFunctionCoreToolsReleasesUrl = getNodeJsBinariesReleaseUrl(version, 'linux', arch);
      break;

    case Platform.mac:
      azureFunctionCoreToolsReleasesUrl = getNodeJsBinariesReleaseUrl(version, 'darwin', arch);
      break;
  }
  downloadAndExtractBinaries(azureFunctionCoreToolsReleasesUrl, targetDirectory, nodeJsDependencyName);
}
