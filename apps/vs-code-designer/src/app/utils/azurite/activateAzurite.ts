/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { azuriteExtensionPrefix, azuriteLocationSetting, extensionCommand } from '../../../constants';
import { localize } from '../../../localize';
import { executeOnAzurite } from '../../azuriteExtension/executeOnAzuriteExt';
import { getWorkspaceSetting, updateGlobalSetting, updateWorkspaceSetting } from '../vsCodeConfig/settings';
import { getWorkspaceFolder } from '../workspace';
import { DialogResponses, type IActionContext } from '@microsoft/vscode-azext-utils';
import * as os from 'os';
import * as path from 'path';
import type { MessageItem } from 'vscode';

/**
 * Prompts user to set azurite.location and Start Azurite.
 * If azurite extension location was not set:
 * Overrides default Azurite location to new default location.
 * User can specify location.
 */
export async function activateAzurite(context: IActionContext): Promise<void> {
  const workspaceFolder = await getWorkspaceFolder(context);
  const workspacePath = workspaceFolder.uri.fsPath;

  const globalAzuriteLocationSetting: string = getWorkspaceSetting<string>(azuriteLocationSetting, workspacePath, azuriteExtensionPrefix);
  context.telemetry.properties.globalAzuriteLocation = globalAzuriteLocationSetting;

  const azuriteLoationSettingKey = 'azuriteLocationSetting';
  const azuriteLocationExtSetting: string = getWorkspaceSetting<string>(azuriteLoationSettingKey);

  const showAutoStartAzuriteWarningKey = 'showAutoStartAzuriteWarning';
  const showAutoStartAzuriteWarning = !!getWorkspaceSetting<boolean>(showAutoStartAzuriteWarningKey);

  const autoStartAzuriteKey = 'autoStartAzurite';
  const autoStartAzurite = !!getWorkspaceSetting<boolean>(autoStartAzuriteKey);
  context.telemetry.properties.autoStartAzurite = `${autoStartAzurite}`;

  if (showAutoStartAzuriteWarning) {
    const enableMessage: MessageItem = { title: localize('enableAutoStart', 'Enable AutoStart') };

    const result = await context.ui.showWarningMessage(
      localize('autoStartAzuriteTitle', 'Configure Azurite to autostart on project launch?'),
      enableMessage,
      DialogResponses.no,
      DialogResponses.dontWarnAgain
    );

    if (result == DialogResponses.dontWarnAgain) {
      await updateGlobalSetting(showAutoStartAzuriteWarningKey, false);
    } else if (result == enableMessage) {
      await updateGlobalSetting(showAutoStartAzuriteWarningKey, false);
      await updateGlobalSetting(autoStartAzuriteKey, true);

      // User has not configured workspace azurite.location.
      if (!azuriteLocationExtSetting) {
        const defaultAzuriteDir = path.join(os.homedir(), '.logicapps', 'azurite');
        const azuriteDir = await context.ui.showInputBox({
          placeHolder: localize('configureAzuriteLocation', 'Azurite Location'),
          prompt: localize('configureWebhookEndpointPrompt', 'Configure Azurite Workspace location folder path'),
          value: defaultAzuriteDir,
        });

        if (azuriteDir) {
          await updateGlobalSetting(azuriteLoationSettingKey, azuriteDir);
        } else {
          await updateGlobalSetting(azuriteLoationSettingKey, defaultAzuriteDir);
        }
      }
    }
  }

  if (getWorkspaceSetting<boolean>(autoStartAzuriteKey)) {
    const azuriteWorkspaceSetting = getWorkspaceSetting<string>(azuriteLoationSettingKey);
    await updateWorkspaceSetting(azuriteLocationSetting, azuriteWorkspaceSetting, workspacePath, azuriteExtensionPrefix);
    await executeOnAzurite(context, extensionCommand.azureAzuriteStart);
    context.telemetry.properties.azuriteStart = 'true';
    context.telemetry.properties.azuriteLocation = azuriteWorkspaceSetting;
  }
}
