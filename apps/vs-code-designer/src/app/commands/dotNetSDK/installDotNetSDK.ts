/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import { executeCommand } from '../../utils/funcCoreTools/cpUtils';

export async function installDotNetSDK(): Promise<void> {
  // version = version || (await promptForFuncVersion(context, localize('selectVersion', 'Select the version of the runtime to install')));

  ext.outputChannel.show();

  switch (process.platform) {
    case 'win32':
      await executeCommand(ext.outputChannel, undefined, 'winget', 'install', 'Microsoft.DotNet.SDK.6');
      break;
    case 'darwin':
      await executeCommand(ext.outputChannel, undefined, 'sudo', 'apt', 'install');
      break;
    case 'linux':
      await executeCommand(ext.outputChannel, undefined, 'brew', 'install');
      break;
  }
}
