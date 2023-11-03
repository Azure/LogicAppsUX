/*------------------p---------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { autoRuntimeDependenciesPathSettingKey, dotnetDependencyName } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { downloadAndExtractBinaries, getDotNetBinariesReleaseUrl } from '../../utils/binaries';
import { getGlobalSetting } from '../../utils/vsCodeConfig/settings';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

export async function installDotNet(context: IActionContext, majorVersion?: string): Promise<void> {
  ext.outputChannel.show();
  context.telemetry.properties.majorVersion = majorVersion;
  const targetDirectory = getGlobalSetting<string>(autoRuntimeDependenciesPathSettingKey);

  context.telemetry.properties.lastStep = 'getDotNetBinariesReleaseUrl';
  const scriptUrl = getDotNetBinariesReleaseUrl();

  context.telemetry.properties.lastStep = 'downloadAndExtractBinaries';
  await downloadAndExtractBinaries(scriptUrl, targetDirectory, dotnetDependencyName, majorVersion);
}
