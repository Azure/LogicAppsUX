/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { dotnet, dotNetInstallScript, dotNetPackageName, dotNetSDKMajorVersion, Platform } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { executeCommand } from '../../utils/funcCoreTools/cpUtils';
import { DialogResponses, openUrl } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { MessageItem } from 'vscode';

export async function updateDotNetSDK(context: IActionContext): Promise<void> {
  ext.outputChannel.show();
  context.telemetry.properties.isUpdating = 'true';
  switch (process.platform) {
    case Platform.windows:
      await executeCommand(ext.outputChannel, undefined, 'winget', 'upgrade', `${dotNetPackageName}.${dotNetSDKMajorVersion}`);
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
      await executeCommand(ext.outputChannel, undefined, 'brew', 'upgrade', `${dotnet}@${dotNetSDKMajorVersion}`);
      break;
  }
}
