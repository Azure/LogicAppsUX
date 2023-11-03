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

  if (azuriteExtension?.isActive) {
    vscode.commands.executeCommand(command, {
      ...args,
    });
  } else {
    const message: string = localize('deactivatedAzuriteExt', 'Azurite extension is deactivated, make sure to activate it');
    await context.ui.showWarningMessage(message);
  }
}
