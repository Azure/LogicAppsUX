/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { validateNodeJsSetting } from '../../../constants';
import { localize } from '../../../localize';
import { executeCommand } from '../../utils/funcCoreTools/cpUtils';
import { getNodeJsCommand } from '../../utils/nodeJs/nodeJsVersion';
import { getWorkspaceSetting } from '../../utils/vsCodeConfig/settings';
import { installNodeJs } from './installNodeJs';
import { callWithTelemetryAndErrorHandling, DialogResponses, openUrl } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { MessageItem } from 'vscode';

/**
 * Checks if node is installed, and installs it if needed.
 * @param {IActionContext} context - Workflow file path.
 * @param {string} message - Message for warning.
 * @param {string} fsPath - Workspace file system path.
 * @returns {Promise<boolean>} Returns true if it is installed or was sucessfully installed, otherwise returns false.
 */
export async function validateNodeJsInstalled(context: IActionContext, message: string, fsPath: string): Promise<boolean> {
  let input: MessageItem | undefined;
  let installed = false;
  const install: MessageItem = { title: localize('install', 'Install') };

  await callWithTelemetryAndErrorHandling('azureLogicAppsStandard.validateNodeJsIsInstalled', async (innerContext: IActionContext) => {
    innerContext.errorHandling.suppressDisplay = true;

    if (!getWorkspaceSetting<boolean>(validateNodeJsSetting, fsPath)) {
      innerContext.telemetry.properties.validateDotNet = 'false';
      installed = true;
    } else if (await isNodeJsInstalled()) {
      installed = true;
    } else {
      const items: MessageItem[] = [install, DialogResponses.learnMore];
      input = await innerContext.ui.showWarningMessage(message, { modal: true }, ...items);
      innerContext.telemetry.properties.dialogResult = input.title;

      if (input === install) {
        await installNodeJs(innerContext);
        installed = true;
      } else if (input === DialogResponses.learnMore) {
        await openUrl('https://nodejs.org/en/download');
      }
    }
  });

  // validate that DotNet was installed only if user confirmed
  if (input === install && !installed) {
    if (
      (await context.ui.showWarningMessage(
        localize('failedInstallDotNet', 'The NodeJS installion has failed and will have to be installed manually.'),
        DialogResponses.learnMore
      )) === DialogResponses.learnMore
    ) {
      await openUrl('https://nodejs.org/en/download');
    }
  }

  return installed;
}

/**
 * Check is dotnet is installed.
 * @returns {Promise<boolean>} Returns true if installed, otherwise returns false.
 */
export async function isNodeJsInstalled(): Promise<boolean> {
  try {
    await executeCommand(undefined, undefined, getNodeJsCommand(), '--version');
    return true;
  } catch (error) {
    return false;
  }
}
