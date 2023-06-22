/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { dotnet, dotNetPackageName, dotNetSDKMajorVersion, Platform, dotNetInstallScript } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { executeCommand } from '../../utils/funcCoreTools/cpUtils';
import { DialogResponses, openUrl } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { MessageItem } from 'vscode';

export async function installDotNetSDK(context: IActionContext): Promise<void> {
  ext.outputChannel.show();

  switch (process.platform) {
    case Platform.windows:
      await executeCommand(ext.outputChannel, undefined, 'winget', 'install', `${dotNetPackageName}.${dotNetSDKMajorVersion}`);
      break;

    case Platform.linux: {
      // Notifies Users of script download.
      const message: string = localize('downloadDotNetInstallScript', 'Downloading .Net Install Script');
      const download: MessageItem = { title: localize('download', 'Download') };

      let result: MessageItem;
      do {
        result = await context.ui.showWarningMessage(message, download, DialogResponses.learnMore);
        if (result === DialogResponses.learnMore) {
          openUrl('https://learn.microsoft.com/en-us/dotnet/core/install/linux-scripted-manual');
        } else if (result == download) {
          await executeCommand(ext.outputChannel, undefined, 'wget', dotNetInstallScript, `-O`, 'dotnet-install.sh');
          await executeCommand(ext.outputChannel, undefined, 'sudo', 'chmod', `+x`, './dotnet-install.sh');
          await executeCommand(ext.outputChannel, undefined, './dotnet-install.sh', '--channel', `${dotNetSDKMajorVersion}.0`);
          await executeCommand(ext.outputChannel, undefined, 'sudo', 'rm', '-rf', './dotnet-install.sh');
        }
      } while (result === DialogResponses.learnMore);

      break;
    }

    case Platform.mac:
      await executeCommand(ext.outputChannel, undefined, 'brew', 'install', `${dotnet}@${dotNetSDKMajorVersion}`);
      await executeCommand(
        ext.outputChannel,
        undefined,
        'export',
        'DOTNET_ROOT',
        '=',
        `$(brew --prefix ${dotnet}@${dotNetSDKMajorVersion})/libexec`,
        '>>',
        '~/.bash_profile'
      );
      await executeCommand(
        ext.outputChannel,
        undefined,
        'export',
        'PATH',
        '=',
        `$(brew --prefix ${dotnet}@${dotNetSDKMajorVersion})/bin:$PATH`,
        '>>',
        '~/.bash_profile'
      );
      await executeCommand(ext.outputChannel, undefined, 'source', '~/.bash_profile');
      break;
  }
}
