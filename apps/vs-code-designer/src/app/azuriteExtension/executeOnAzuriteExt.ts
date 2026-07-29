/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { azuriteExtensionId } from '../../constants';
import { localize } from '../../localize';
import { AzuriteExtensionTerminalError } from './azuriteErrors';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { extensions } from 'vscode';
import * as vscode from 'vscode';

export async function executeOnAzurite(context: IActionContext, command: string, ...args: any[]): Promise<void> {
  const azuriteExtension = extensions.getExtension(azuriteExtensionId);

  if (!azuriteExtension) {
    context.telemetry.properties.azuriteExtensionAvailable = 'false';
    // Terminal: no amount of waiting makes a missing extension appear.
    throw new AzuriteExtensionTerminalError(
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
      // Terminal: an extension that cannot activate will not start serving on a retry.
      throw new AzuriteExtensionTerminalError(
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
  // Forward caller arguments verbatim. Spreading the `args` array into an object
  // literal would produce numeric keys ({ 0: 'a', 1: 'b' }) and collapse them into
  // a single argument. The no-arg case keeps passing an empty options object so the
  // Azurite start command sees the same payload it always has.
  if (args.length > 0) {
    await vscode.commands.executeCommand(command, ...args);
  } else {
    await vscode.commands.executeCommand(command, {});
  }
}
