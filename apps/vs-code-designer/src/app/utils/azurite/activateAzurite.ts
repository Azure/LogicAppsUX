/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { azuriteExtensionPrefix, azuriteLocationSetting, extensionCommand } from '../../../constants';
import { localize } from '../../../localize';
import { executeOnAzurite } from '../../azuriteExtension/executeOnAzuriteExt';
import { getGlobalSetting, updateGlobalSetting } from '../vsCodeConfig/settings';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as os from 'os';

/**
 * Prompts user to set azurite.location and Start Azurite.
 * If azurite extension location was not set:
 * Overrides default Azurite location to new default location.
 * User can specify location.
 */
export async function activateAzurite(context: IActionContext): Promise<void> {
  const userAzuriteDir: string = getGlobalSetting(azuriteLocationSetting, azuriteExtensionPrefix);
  context.telemetry.properties.azuriteLocation = userAzuriteDir;
  // User has not configured azurite.location.
  if (!userAzuriteDir) {
    const defaultAzuriteDir = `${os.homedir()}\\.azurite`;
    const azuriteDir = await context.ui.showInputBox({
      placeHolder: localize('configureAzuriteLocation', 'Azurite Location'),
      prompt: localize('configureWebhookEndpointPrompt', 'Configure Azurite Workspace location folder path'),
      value: defaultAzuriteDir,
    });

    if (azuriteDir) {
      await updateGlobalSetting(azuriteLocationSetting, azuriteDir, azuriteExtensionPrefix);
      context.telemetry.properties.azuriteLocation = azuriteDir;
    } else {
      await updateGlobalSetting(azuriteLocationSetting, defaultAzuriteDir, azuriteExtensionPrefix);
      context.telemetry.properties.azuriteLocation = defaultAzuriteDir;
    }
  }

  await executeOnAzurite(context, extensionCommand.azureAzuriteStart);
  context.telemetry.properties.azuriteStart = 'true';
}
