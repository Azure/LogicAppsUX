/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { azuriteLocationSetting, extensionCommand } from '../../../constants';
import { localize } from '../../../localize';
import { executeOnAzurite } from '../../azuriteExtension/executeOnAzuriteExt';
import { getAzuriteConfiguration } from '../../azuriteExtension/getAzuriteConfiguration';
import { updateAzuriteConfiguration } from '../../azuriteExtension/updateAzuriteConfiguration';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as os from 'os';

/**
 * Prompts user to set azurite.location and Start Azurite.
 * If azurite extension location was not set:
 * Overrides default Azurite location to new default location.
 * User can specify location.
 */
export async function activateAzurite(context: IActionContext): Promise<void> {
  const userAzuriteDir = await getAzuriteConfiguration(context, azuriteLocationSetting);
  const defaultAzuriteDir = `${os.homedir()}\\.azurite`;
  const azuriteDir = await context.ui.showInputBox({
    placeHolder: localize('configureAzuriteLocation', 'Azurite Location'),
    prompt: localize('configureWebhookEndpointPrompt', 'Configure Azurite Workspace location folder path'),
    value: userAzuriteDir ?? defaultAzuriteDir,
  });

  if (azuriteDir) {
    await updateAzuriteConfiguration(context, azuriteLocationSetting, azuriteDir);
    context.telemetry.properties.azuriteLocation = azuriteDir;
  } else {
    await updateAzuriteConfiguration(context, azuriteLocationSetting, defaultAzuriteDir);
    context.telemetry.properties.azuriteLocation = defaultAzuriteDir;
  }

  await executeOnAzurite(context, extensionCommand.azureAzuriteStart);
  context.telemetry.properties.azuriteStart = 'true';
}
