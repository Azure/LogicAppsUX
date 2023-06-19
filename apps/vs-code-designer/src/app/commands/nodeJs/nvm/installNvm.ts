/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { nvmWingetPackageName, Platform } from '../../../../constants';
import { ext } from '../../../../extensionVariables';
import { localize } from '../../../../localize';
import { executeCommand } from '../../../utils/funcCoreTools/cpUtils';
import { uninstallNodeJs } from '../uninstallNodeJs';
import { DialogResponses, openUrl } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { MessageItem } from 'vscode';

export async function installNvm(context: IActionContext): Promise<void> {
  ext.outputChannel.show();

  // Notifies Users of NVM install.
  const message: string = localize('installNvm', 'Node Version Manager');
  const install: MessageItem = { title: localize('install', 'Install') };

  let result: MessageItem;
  do {
    result = await context.ui.showWarningMessage(message, install, DialogResponses.learnMore);
    if (result === DialogResponses.learnMore) {
      openUrl('https://learn.microsoft.com/en-us/windows/dev-environment/javascript/nodejs-on-windows#install-nvm-windows-nodejs-and-npm');
    } else if (result == install) {
      switch (process.platform) {
        case Platform.windows:
          uninstallNodeJs();
          await executeCommand(ext.outputChannel, undefined, 'winget', 'install', '-e', '--id', nvmWingetPackageName);
          break;
      }
    }
  } while (result === DialogResponses.learnMore);
}
