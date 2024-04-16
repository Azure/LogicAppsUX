/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { validateDotNetSDKSetting } from '../../../constants';
import { localize } from '../../../localize';
import { getDotNetCommand } from '../../utils/dotnet/dotnet';
import { executeCommand } from '../../utils/funcCoreTools/cpUtils';
import { getWorkspaceSetting } from '../../utils/vsCodeConfig/settings';
import { installDotNet } from './installDotNet';
import { callWithTelemetryAndErrorHandling, DialogResponses, openUrl } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { MessageItem } from 'vscode';

/**
 * Checks if dotnet 6 is installed, and installs it if needed.
 * @param {IActionContext} context - Workflow file path.
 * @param {string} fsPath - Workspace file system path.
 * @returns {Promise<boolean>} Returns true if it is installed or was sucessfully installed, otherwise returns false.
 */
export async function validateDotNetIsInstalled(context: IActionContext, fsPath: string): Promise<boolean> {
  let input: MessageItem | undefined;
  let installed = false;
  const install: MessageItem = { title: localize('install', 'Install') };
  const message: string = localize('installDotnetSDK', 'You must have the .NET SDK installed. Would you like to install it now?');
  await callWithTelemetryAndErrorHandling('azureLogicAppsStandard.validateDotNetIsInstalled', async (innerContext: IActionContext) => {
    innerContext.errorHandling.suppressDisplay = true;

    if (!getWorkspaceSetting<boolean>(validateDotNetSDKSetting, fsPath)) {
      innerContext.telemetry.properties.validateDotNet = 'false';
      installed = true;
    } else if (await isDotNetInstalled()) {
      installed = true;
    } else {
      const items: MessageItem[] = [install, DialogResponses.learnMore];
      input = await innerContext.ui.showWarningMessage(message, { modal: true }, ...items);
      innerContext.telemetry.properties.dialogResult = input.title;

      if (input === install) {
        await installDotNet(innerContext);
        installed = true;
      } else if (input === DialogResponses.learnMore) {
        await openUrl('https://dotnet.microsoft.com/download/dotnet/6.0');
      }
    }
  });

  // validate that DotNet was installed only if user confirmed
  if (input === install && !installed) {
    if (
      (await context.ui.showWarningMessage(
        localize('failedInstallDotNet', 'The .NET SDK installation failed. Please manually install instead.'),
        DialogResponses.learnMore
      )) === DialogResponses.learnMore
    ) {
      await openUrl('https://dotnet.microsoft.com/download/dotnet/6.0');
    }
  }

  return installed;
}

/**
 * Check is dotnet is installed.
 * @returns {Promise<boolean>} Returns true if installed, otherwise returns false.
 */
export async function isDotNetInstalled(): Promise<boolean> {
  try {
    await executeCommand(undefined, undefined, getDotNetCommand(), '--version');
    return true;
  } catch (error) {
    return false;
  }
}
