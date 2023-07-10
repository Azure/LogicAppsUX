/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { nvmInstallScript, nvmWingetPackageName, Platform } from '../../../../constants';
import { ext } from '../../../../extensionVariables';
import { executeCommand } from '../../../utils/funcCoreTools/cpUtils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

export async function installNvm(context: IActionContext): Promise<void> {
  ext.outputChannel.show();
  context.telemetry.properties.installNodeJs = 'true';
  switch (process.platform) {
    case Platform.windows:
      await executeCommand(ext.outputChannel, undefined, 'winget', 'install', '--silent', '-e', '--id', nvmWingetPackageName);
      break;
    case Platform.mac:
      await executeCommand(ext.outputChannel, undefined, 'brew', 'update');
      await executeCommand(ext.outputChannel, undefined, 'brew', 'install', 'nvm');
      await executeCommand(ext.outputChannel, undefined, 'source', '$(brew --prefix nvm)/nvm.sh');
      await executeCommand(ext.outputChannel, undefined, 'echo', '"source $(brew --prefix nvm)/nvm.sh"', '>>', '~/.profile');
      break;
    case Platform.linux:
      await executeCommand(ext.outputChannel, undefined, 'wget', '-qO', nvmInstallScript, '|', 'bash');
      await executeCommand(undefined, undefined, 'source', '~/.bashrc');
      await executeCommand(undefined, undefined, 'source', '~/.zshrc');
      await executeCommand(undefined, undefined, '.', '~/.profile');
      break;
  }
}
