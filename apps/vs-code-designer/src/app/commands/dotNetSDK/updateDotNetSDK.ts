/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import { executeCommand } from '../../utils/funcCoreTools/cpUtils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

export async function updateDotNetSDK(context: IActionContext): Promise<void> {
  ext.outputChannel.show();
  context.telemetry.properties.isUpdating = 'true';
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
