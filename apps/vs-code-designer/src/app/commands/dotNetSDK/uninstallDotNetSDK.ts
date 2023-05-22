/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { dotnet, dotNetPackageName, dotNetAptPackageName, dotNetSDKMajorVersion, Platform } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { executeCommand } from '../../utils/funcCoreTools/cpUtils';

export async function uninstallDotNetSDK(): Promise<void> {
  ext.outputChannel.show();

  switch (process.platform) {
    case Platform.windows:
      await executeCommand(ext.outputChannel, undefined, 'winget', 'uninstall', `${dotNetPackageName}.${dotNetSDKMajorVersion}`);
      break;
    case Platform.linux:
      await executeCommand(ext.outputChannel, undefined, 'sudo', 'apt-get', 'remove', `${dotNetAptPackageName}-${dotNetSDKMajorVersion}.0`);
      break;
    case Platform.mac:
      await executeCommand(ext.outputChannel, undefined, 'brew', 'uninstall', `${dotnet}@${dotNetSDKMajorVersion}`);
      break;
  }
}
