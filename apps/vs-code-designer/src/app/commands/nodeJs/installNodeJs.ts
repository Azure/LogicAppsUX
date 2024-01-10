/*------------------p---------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Platform, autoRuntimeDependenciesPathSettingKey, nodeJsDependencyName } from '../../../constants';
import { ext } from '../../../extensionVariables';
import {
  downloadAndExtractDependency,
  getCpuArchitecture,
  getLatestNodeJsVersion,
  getNodeJsBinariesReleaseUrl,
} from '../../utils/binaries';
import { getGlobalSetting } from '../../utils/vsCodeConfig/settings';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

export async function installNodeJs(context: IActionContext, majorVersion?: string): Promise<void> {
  ext.outputChannel.show();
  const arch = getCpuArchitecture();
  const targetDirectory = getGlobalSetting<string>(autoRuntimeDependenciesPathSettingKey);
  context.telemetry.properties.lastStep = 'getLatestNodeJsVersion';
  const version = await getLatestNodeJsVersion(context, majorVersion);
  let nodeJsReleaseUrl;

  context.telemetry.properties.lastStep = 'getNodeJsBinariesReleaseUrl';
  switch (process.platform) {
    case Platform.windows:
      nodeJsReleaseUrl = getNodeJsBinariesReleaseUrl(version, 'win', arch);
      break;

    case Platform.linux:
      nodeJsReleaseUrl = getNodeJsBinariesReleaseUrl(version, 'linux', arch);
      break;

    case Platform.mac:
      nodeJsReleaseUrl = getNodeJsBinariesReleaseUrl(version, 'darwin', arch);
      break;
  }

  context.telemetry.properties.lastStep = 'downloadAndExtractBinaries';
  await downloadAndExtractDependency(nodeJsReleaseUrl, targetDirectory, nodeJsDependencyName);
}
