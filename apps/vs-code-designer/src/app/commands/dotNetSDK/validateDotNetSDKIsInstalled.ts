/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { PackageManager } from '../../../constants';
import { validateDotNetSDKSetting } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { getLocalDotNetSDKVersion } from '../../utils/dotnet/dotNetVersion';
import { getDotNetPackageManager } from '../../utils/dotnet/getDotNetPackageManager';
import { executeCommand } from '../../utils/funcCoreTools/cpUtils';
import { getWorkspaceSetting } from '../../utils/vsCodeConfig/settings';
import { installDotNetSDK } from './installDotNetSDK';
import { callWithTelemetryAndErrorHandling, DialogResponses, openUrl } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { MessageItem } from 'vscode';

/**
 * Checks if .NET SDK is installed, and installs it if needed.
 * @param {IActionContext} context - Workflow file path.
 * @param {string} message - Message for warning.
 * @param {string} fsPath - Workspace file system path.
 * @returns {Promise<boolean>} Returns true if it is installed or was sucessfully installed, otherwise returns false.
 */
export async function validateDotNetSDKIsInstalled(context: IActionContext, message: string, fsPath: string): Promise<boolean> {
  let input: MessageItem | undefined;
  let installed = false;
  const install: MessageItem = { title: localize('install', 'Install') };

  await callWithTelemetryAndErrorHandling('azureLogicAppsStandard.validateDotNetSDKIsInstalled', async (innerContext: IActionContext) => {
    innerContext.errorHandling.suppressDisplay = true;

    if (!getWorkspaceSetting<boolean>(validateDotNetSDKSetting, fsPath)) {
      innerContext.telemetry.properties.validatDotNetSDK = 'false';
      installed = true;
    } else if (await isDotNetSDKInstalled()) {
      installed = true;
      innerContext.telemetry.properties.validatDotNetSDK = 'true';
    } else {
      const items: MessageItem[] = [];
      const packageManagers: PackageManager[] = await getDotNetPackageManager(context, false /* isDotNetInstalled */);
      if (packageManagers.length > 0) {
        items.push(install);
      } else {
        items.push(DialogResponses.learnMore);
      }

      input = await innerContext.ui.showWarningMessage(message, { modal: true }, ...items);

      innerContext.telemetry.properties.dialogResult = input.title;

      if (input === install) {
        await installDotNetSDK();
        installed = true;
      } else if (input === DialogResponses.learnMore) {
        await openUrl('https://dotnet.microsoft.com/en-us/download/dotnet/6.0');
      }
    }
  });

  if (input === install && !installed) {
    if (
      (await context.ui.showWarningMessage(
        localize('failedInstallDotNetSDK', 'The .Net SDK 6 installion has failed and will have to be installed manually.'),
        DialogResponses.learnMore
      )) === DialogResponses.learnMore
    ) {
      await openUrl('https://dotnet.microsoft.com/en-us/download/dotnet/6.0');
    }
  }

  return installed;
}

/**
 * Check is .net sdk 6 is installed.
 * @returns {Promise<boolean>} Returns true if installed, otherwise returns false.
 */
export async function isDotNetSDKInstalled(): Promise<boolean> {
  try {
    await executeCommand(undefined, undefined, ext.dotNetCliPath, '--version');
    return getLocalDotNetSDKVersion() != null ? true : false;
  } catch (error) {
    return false;
  }
}
