/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { nvmWingetPackageName, Platform } from '../../../../constants';
import { ext } from '../../../../extensionVariables';
import { executeCommand } from '../../../utils/funcCoreTools/cpUtils';

export async function uninstallNvm(): Promise<void> {
  ext.outputChannel.show();
  // Need to uninstall ALL node before uninstalling nvm...
  switch (process.platform) {
    case Platform.windows:
      await executeCommand(ext.outputChannel, undefined, 'winget', 'uninstall', nvmWingetPackageName);
      break;
  }
}
