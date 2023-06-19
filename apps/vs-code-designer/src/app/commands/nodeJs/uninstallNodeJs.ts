/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Platform } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { executeCommand } from '../../utils/funcCoreTools/cpUtils';

export async function uninstallNodeJs(): Promise<void> {
  ext.outputChannel.show();

  switch (process.platform) {
    case Platform.windows:
      await executeCommand(ext.outputChannel, undefined, 'npm', 'cache', 'clean', '--force');
      break;
  }
}
