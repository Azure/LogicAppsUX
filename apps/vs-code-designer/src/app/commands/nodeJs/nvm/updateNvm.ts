/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { nvmWingetPackageName, Platform } from '../../../../constants';
import { ext } from '../../../../extensionVariables';
import { executeCommand } from '../../../utils/funcCoreTools/cpUtils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

export async function updateDotNetSDK(context: IActionContext): Promise<void> {
  ext.outputChannel.show();
  context.telemetry.properties.isUpdateNvm = 'true';
  switch (process.platform) {
    case Platform.windows:
      await executeCommand(ext.outputChannel, undefined, 'winget', 'upgrade', nvmWingetPackageName);
      break;
  }
}
