/*------------------p---------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { dependenciesPathSettingKey, dotnetDependencyName } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { downloadAndExtractBinaries, getDotNetBinariesReleaseUrl, getLatestDotNetVersion } from '../../utils/binaries';
import { getGlobalSetting } from '../../utils/vsCodeConfig/settings';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

export async function installDotNet(context: IActionContext, majorVersion?: string): Promise<void> {
  ext.outputChannel.show();

  const targetDirectory = getGlobalSetting<string>(dependenciesPathSettingKey);
  const version = await getLatestDotNetVersion(context, majorVersion);
  const azureFunctionCoreToolsReleasesUrl = getDotNetBinariesReleaseUrl(version);

  await downloadAndExtractBinaries(azureFunctionCoreToolsReleasesUrl, targetDirectory, dotnetDependencyName);
}
