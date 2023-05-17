/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { dotnet, dotNetPackageName, dotNetAptPackageName, dotNetSDKMajorVersion } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { executeCommand } from '../../utils/funcCoreTools/cpUtils';

export async function installDotNetSDK(): Promise<void> {
  ext.outputChannel.show();

  switch (process.platform) {
    case 'win32':
      await executeCommand(ext.outputChannel, undefined, 'winget', 'install', `${dotNetPackageName}.${dotNetSDKMajorVersion}`);
      break;
    case 'linux':
      await executeCommand(
        ext.outputChannel,
        undefined,
        'sudo',
        'apt-get',
        'update',
        '&&',
        'sudo',
        'apt-get',
        'install',
        '-y',
        `${dotNetAptPackageName}-${dotNetSDKMajorVersion}.0`
      );
      break;
    case 'darwin':
      await executeCommand(ext.outputChannel, undefined, 'brew', 'install', `${dotnet}@${dotNetSDKMajorVersion}`);
      break;
  }
}
