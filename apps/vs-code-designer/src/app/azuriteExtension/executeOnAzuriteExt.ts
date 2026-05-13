/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { azuriteExtensionId } from '../../constants';
import { localize } from '../../localize';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { extensions } from 'vscode';
import * as vscode from 'vscode';

export async function executeOnAzurite(context: IActionContext, command: string, ...args: any[]): Promise<void> {
  const azuriteExtension = extensions.getExtension(azuriteExtensionId);

  if (!azuriteExtension) {
    context.telemetry.properties.azuriteExtensionAvailable = 'false';
    throw new Error(
      localize(
        'missingAzuriteExt',
        'Azurite extension is not installed or is unavailable in the current VS Code extension host. Make sure the Azurite extension is installed and enabled, then try debugging again.'
      )
    );
  }

  context.telemetry.properties.azuriteExtensionAvailable = 'true';
  if (!azuriteExtension.isActive) {
    context.telemetry.properties.azuriteExtensionActive = 'false';
    try {
      await azuriteExtension.activate();
    } catch (error) {
      throw new Error(
        localize(
          'activateAzuriteExtFailed',
          'Azurite extension could not be activated. Make sure the Azurite extension is installed and enabled, then try debugging again. {0}',
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  context.telemetry.properties.azuriteExtensionActive = 'true';
  context.telemetry.properties.azuriteStartCommandIssued = 'true';
  await vscode.commands.executeCommand(command, {
    ...args,
  });
}
