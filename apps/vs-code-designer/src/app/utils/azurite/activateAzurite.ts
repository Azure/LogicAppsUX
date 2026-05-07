/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  autoStartAzuriteSetting,
  azuriteBinariesLocationSetting,
  azuriteExtensionPrefix,
  azuriteLocationSetting,
  defaultAzuritePathValue,
  extensionCommand,
  showAutoStartAzuriteWarning,
} from '../../../constants';
import { localize } from '../../../localize';
import { executeOnAzurite } from '../../azuriteExtension/executeOnAzuriteExt';
import { validateEmulatorIsRunning } from '../../debug/validatePreDebug';
import { delay } from '../delay';
import { tryGetLogicAppProjectRoot } from '../verifyIsProject';
import { getWorkspaceSetting, updateGlobalSetting, updateWorkspaceSetting } from '../vsCodeConfig/settings';
import { getWorkspaceFolder } from '../workspace';
import { DialogResponses, type IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import type { MessageItem } from 'vscode';

const azuriteStartupRetryCount = 10;
const azuriteStartupRetryDelayMs = 500;

/**
 * Prompts user to set azurite.location and Start Azurite.
 * If azurite extension location was not set:
 * Overrides default Azurite location to new default location.
 * User can specify location.
 */
export async function activateAzurite(context: IActionContext, projectPath?: string): Promise<void> {
  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
    if (!projectPath) {
      const workspaceFolder = await getWorkspaceFolder(context, undefined, true);
      projectPath = await tryGetLogicAppProjectRoot(context, workspaceFolder);
    }

    if (projectPath) {
      const globalAzuriteLocationSetting: string = getWorkspaceSetting<string>(azuriteLocationSetting, projectPath, azuriteExtensionPrefix);
      context.telemetry.properties.globalAzuriteLocation = globalAzuriteLocationSetting;

      const azuriteLocationExtSetting: string = getWorkspaceSetting<string>(azuriteBinariesLocationSetting);

      const showAutoStartAzuriteWarningSetting = !!getWorkspaceSetting<boolean>(showAutoStartAzuriteWarning);

      let autoStartAzurite = !!getWorkspaceSetting<boolean>(autoStartAzuriteSetting);
      context.telemetry.properties.autoStartAzurite = `${autoStartAzurite}`;

      if (showAutoStartAzuriteWarningSetting) {
        const enableMessage: MessageItem = { title: localize('enableAutoStart', 'Enable AutoStart') };

        const result = await context.ui.showWarningMessage(
          localize('autoStartAzuriteTitle', 'Configure Azurite to autostart on project debug?'),
          enableMessage,
          DialogResponses.no,
          DialogResponses.dontWarnAgain
        );

        if (result === DialogResponses.dontWarnAgain) {
          await updateGlobalSetting(showAutoStartAzuriteWarning, false);
        } else if (result === enableMessage) {
          await updateGlobalSetting(showAutoStartAzuriteWarning, false);
          await updateGlobalSetting(autoStartAzuriteSetting, true);
          autoStartAzurite = true;
          context.telemetry.properties.autoStartAzurite = 'true';

          // User has not configured workspace azurite.location.
          if (!azuriteLocationExtSetting) {
            const azuriteDir = await context.ui.showInputBox({
              placeHolder: localize('configureAzuriteLocation', 'Azurite Location'),
              prompt: localize('configureWebhookEndpointPrompt', 'Configure Azurite Workspace location folder path'),
              value: defaultAzuritePathValue,
            });

            if (azuriteDir) {
              await updateGlobalSetting(azuriteBinariesLocationSetting, azuriteDir);
            } else {
              await updateGlobalSetting(azuriteBinariesLocationSetting, defaultAzuritePathValue);
            }
          }
        }
      } else if (autoStartAzurite && !azuriteLocationExtSetting) {
        await updateGlobalSetting(azuriteBinariesLocationSetting, defaultAzuritePathValue);
        vscode.window.showInformationMessage(
          localize('autoAzuriteLocation', `Azurite is setup to auto start at ${defaultAzuritePathValue}`)
        );
      }

      const isAzuriteRunning = await validateEmulatorIsRunning(context, projectPath, false);

      if (autoStartAzurite && !isAzuriteRunning) {
        // Use the configured location, or default to the global default path
        const azuriteLocation = azuriteLocationExtSetting || defaultAzuritePathValue;
        await updateWorkspaceSetting(azuriteLocationSetting, azuriteLocation, projectPath, azuriteExtensionPrefix);
        await executeOnAzurite(context, extensionCommand.azureAzuriteStart);
        context.telemetry.properties.azuriteStart = 'true';
        context.telemetry.properties.azuriteLocation = azuriteLocation;
        await waitForAzuriteReady(context, projectPath);
      }
    }
  }
}

async function waitForAzuriteReady(context: IActionContext, projectPath: string): Promise<void> {
  for (let attempt = 1; attempt <= azuriteStartupRetryCount; attempt++) {
    context.telemetry.properties.azuriteStartupAttempt = attempt.toString();
    if (await validateEmulatorIsRunning(context, projectPath, false)) {
      context.telemetry.properties.azuriteReady = 'true';
      return;
    }

    if (attempt < azuriteStartupRetryCount) {
      await delay(azuriteStartupRetryDelayMs);
    }
  }

  context.telemetry.properties.azuriteReady = 'false';
  throw new Error(
    localize(
      'azuriteFailedToStart',
      'Azurite did not become ready within "{0}" seconds. Make sure the Azurite extension is installed and running, then try debugging again.',
      (azuriteStartupRetryCount * azuriteStartupRetryDelayMs) / 1000
    )
  );
}
