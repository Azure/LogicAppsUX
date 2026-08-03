/*------------------p---------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { dotnetDependencyName } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { downloadAndExtractDependency, ensureRuntimeDependenciesDir, getDotNetBinariesReleaseUrl } from '../../utils/binaries';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

export async function installDotNet(context: IActionContext, majorVersion?: string): Promise<void> {
  ext.outputChannel.show();
  context.telemetry.properties.majorVersion = majorVersion;
  const targetDirectory = await ensureRuntimeDependenciesDir();

  context.telemetry.properties.lastStep = 'getDotNetBinariesReleaseUrl';
  const scriptUrl = getDotNetBinariesReleaseUrl();

  context.telemetry.properties.lastStep = 'downloadAndExtractBinaries';
  await downloadAndExtractDependency(context, scriptUrl, targetDirectory, dotnetDependencyName, null, majorVersion);
}
