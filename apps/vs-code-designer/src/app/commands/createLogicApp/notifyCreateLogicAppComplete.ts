/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import type { SlotTreeItemBase } from '../../tree/slotsTree/SlotTreeItemBase';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import type { MessageItem } from 'vscode';
import { window } from 'vscode';

/**
 * Shows information message after the creation of Logic app has been completed and let user select post actions.
 * @param {SlotTreeItemBase} node - Logic app node structure.
 */
export async function notifyCreateLogicAppComplete(node: SlotTreeItemBase): Promise<void> {
  const deployComplete: string = localize('creationComplete', 'Creation of "{0}" completed.', node.site.qName);
  const viewOutput: MessageItem = { title: localize('viewOutput', 'View output') };

  window.showInformationMessage(deployComplete, viewOutput).then(async (result) => {
    await callWithTelemetryAndErrorHandling('postCreation', async (postDeployContext: IActionContext) => {
      postDeployContext.telemetry.properties.dialogResult = result && result.title;
      if (result === viewOutput) {
        ext.outputChannel.show();
      }
    });
  });
}
