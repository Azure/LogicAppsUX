/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Platform } from '../../../constants';
import { localize } from '../../../localize';
import { executeCommand } from '../funcCoreTools/cpUtils';
import { getWorkspaceSetting, updateGlobalSetting } from '../vsCodeConfig/settings';
import { DialogResponses, callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { MessageItem } from 'vscode';

export async function getPackageManager(): Promise<void> {
  await callWithTelemetryAndErrorHandling('azureLogicAppsStandard.getPackageManager', async (context: IActionContext) => {
    context.errorHandling.suppressDisplay = true;
    context.telemetry.properties.isActivationEvent = 'true';
    context.telemetry.properties.platform = process.platform;

    const showMissingPackageManagerWarningKey = 'showMissingPackageManagerWarning';
    const platformPackageManagerKey = 'PlatformPackageManager';

    switch (process.platform) {
      case Platform.linux:
        await executeCommand(undefined, undefined, 'sudo', 'apt-get', '--version');
        await updateGlobalSetting(platformPackageManagerKey, 'apt-get');
        break;
      case Platform.windows:
        await executeCommand(undefined, undefined, 'winget', '--version');
        await updateGlobalSetting(platformPackageManagerKey, 'winget');
        break;
      case Platform.mac:
        await executeCommand(undefined, undefined, 'brew', '--version');
        await updateGlobalSetting(platformPackageManagerKey, 'brew');
        break;
      default: {
        // Package Manager expected missing.
        const message: string = localize('missingPackageManager', 'Missing expected Package Manager');

        let result: MessageItem;

        do {
          result = await context.ui.showWarningMessage(message, DialogResponses.dontWarnAgain);
          if (result === DialogResponses.dontWarnAgain) {
            await updateGlobalSetting(showMissingPackageManagerWarningKey, false);
          }
        } while (result === DialogResponses.learnMore);
      }
    }

    context.telemetry.properties.getPackageManager = getWorkspaceSetting<string>(platformPackageManagerKey);
  });
}
